// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
// Fallback si no está seteado el secreto GEMINI_MODEL. gemini-3.8-flash es el
// modelo vigente verificado (gemini-1.5-flash ya da 404, Google lo deprecó).
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.8-flash";

// El Centro de Pagos la invoca por fetch desde el navegador — sin esto el
// preflight OPTIONS no pasa y el POST ni llega a esta función.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Debe quedar sincronizado a mano con `EXPENSE_CATEGORIES.FIJO` en
// src/types/finance.ts (la Edge Function corre en Deno, no puede importar
// código del frontend directo). "Otro" es la salida de emergencia para que
// el modelo no fuerce una categoría real cuando no está seguro.
const FIXED_CATEGORIES = [
  "Alquiler",
  "Expensas",
  "Obra Social",
  "ABL",
  "Edenor",
  "Metrogas",
  "Internet/Teléfono",
  "Seguro Auto",
  "Patente",
  "Gimnasio",
  "Streaming (Netflix, YT)",
  "Otro",
];

const INVOICE_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    monto_total: { type: "NUMBER" },
    numero_cliente: { type: "STRING" },
    categoria_sugerida: { type: "STRING", enum: FIXED_CATEGORIES },
  },
  required: ["monto_total", "numero_cliente", "categoria_sugerida"],
};

interface InvoiceData {
  monto_total: number;
  numero_cliente: string;
  categoria_sugerida: string;
}

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: CORS_HEADERS });
}

const MAX_GEMINI_ATTEMPTS = 3;
// 503 (modelo sobrecargado) y 429 (rate limit) son errores transitorios del
// lado de Gemini — vale la pena reintentar. El resto (400, 404, etc.) son
// errores de verdad (PDF/request mal formado, modelo inexistente) que no se
// arreglan solos, reintentarlos solo tarda más en fallar.
const RETRYABLE_STATUSES = new Set([503, 429]);
const RETRY_DELAYS_MS = [1000, 2000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pega a Gemini, reintentando sola ante 503/429 (hasta `MAX_GEMINI_ATTEMPTS` veces). */
async function callGeminiWithRetry(url: string, body: string): Promise<Response> {
  let lastResponse: Response | undefined;

  for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (response.ok || !RETRYABLE_STATUSES.has(response.status)) {
      return response;
    }

    lastResponse = response;
    if (attempt < MAX_GEMINI_ATTEMPTS) {
      await sleep(RETRY_DELAYS_MS[attempt - 1]);
    }
  }

  return lastResponse as Response;
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: CORS_HEADERS });
    }

    if (req.method !== "POST") {
      return errorResponse("Método no permitido.", 405);
    }

    let pdfBase64: unknown;
    try {
      ({ pdfBase64 } = await req.json());
    } catch {
      return errorResponse("Body inválido: se esperaba JSON.", 400);
    }

    if (typeof pdfBase64 !== "string" || !pdfBase64) {
      return errorResponse("Falta pdfBase64 en el body.", 400);
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return errorResponse("Falta GEMINI_API_KEY en los secretos de la función.", 500);
    }

    const url = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const requestBody = JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: `Sos un analizador de facturas. Extraé el monto total a pagar y el número de cliente/cuenta del documento adjunto. Además, clasificá el proveedor dentro de esta lista de categorías: ${FIXED_CATEGORIES.join(", ")}. Si ninguna aplica claramente, usá "Otro" en vez de forzar una que no corresponde.`,
          },
        ],
      },
      contents: [{ parts: [{ inlineData: { mimeType: "application/pdf", data: pdfBase64 } }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: INVOICE_RESPONSE_SCHEMA },
    });

    let geminiResponse: Response;
    try {
      geminiResponse = await callGeminiWithRetry(url, requestBody);
    } catch {
      // Gemini caído / timeout de red — 502, no 500: el problema es del upstream, no nuestro.
      return errorResponse("No se pudo conectar con Gemini.", 502);
    }

    if (!geminiResponse.ok) {
      // Si llegó acá con 503/429 es porque ya se reintentó `MAX_GEMINI_ATTEMPTS`
      // veces y siguió fallando — recién ahí se lo mostramos al usuario.
      return errorResponse(`Gemini devolvió ${geminiResponse.status} analizando la factura.`, 502);
    }

    const data = (await geminiResponse.json()) as {
      candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
    };
    const text = data.candidates?.[0]?.content.parts[0]?.text;
    if (!text) {
      return errorResponse("Gemini no devolvió contenido para este PDF.", 502);
    }

    let invoice: InvoiceData;
    try {
      invoice = JSON.parse(text) as InvoiceData;
    } catch {
      return errorResponse("Gemini devolvió una respuesta que no se pudo interpretar.", 502);
    }

    return Response.json(invoice, { headers: CORS_HEADERS });
  },
};

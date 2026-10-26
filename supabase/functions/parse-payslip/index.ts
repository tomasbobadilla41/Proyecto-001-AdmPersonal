// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
// Mismo fallback que parse-invoice — ver el comentario ahí sobre por qué
// gemini-1.5-flash ya no sirve.
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.8-flash";

// Mismo mecanismo que parse-invoice: refleja el origen solo si está en la
// whitelist (dev + producción), porque Access-Control-Allow-Origin no admite
// una lista.
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "https://proyecto-001-adm-personal.vercel.app",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

// Mismo límite que parse-invoice (ver ahí el comentario sobre el factor 4/3 de Base64).
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil((MAX_PDF_SIZE_BYTES * 4) / 3);

const PAYSLIP_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    sueldo_neto: { type: "NUMBER" },
    horas_extras: {
      type: "OBJECT",
      properties: {
        detectadas: { type: "BOOLEAN" },
        cantidad_horas: { type: "NUMBER" },
        monto: { type: "NUMBER" },
      },
      required: ["detectadas"],
    },
    descuento_gimnasio: { type: "NUMBER" },
  },
  required: ["sueldo_neto", "horas_extras"],
};

interface PayslipData {
  sueldo_neto: number;
  horas_extras: {
    detectadas: boolean;
    cantidad_horas?: number;
    monto?: number;
  };
  descuento_gimnasio?: number;
}

function errorResponse(message: string, status: number, headers: Record<string, string>): Response {
  return Response.json({ error: message }, { status, headers });
}

const MAX_GEMINI_ATTEMPTS = 3;
// Mismos códigos transitorios que parse-invoice (modelo sobrecargado / rate limit).
const RETRYABLE_STATUSES = new Set([503, 429]);
const RETRY_DELAYS_MS = [1000, 2000];
// Si Gemini no responde nada (ni error, se cuelga) dentro de esto, lo
// tratamos como transitorio y reintentamos — sin esto, un fetch colgado
// se queda esperando hasta que la plataforma mata la función entera a los
// 150s (visto en vivo: IDLE_TIMEOUT), en vez de devolver un error claro.
const GEMINI_FETCH_TIMEOUT_MS = 20_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchGeminiWithTimeout(url: string, body: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_FETCH_TIMEOUT_MS);
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
}

/** Pega a Gemini, reintentando sola ante 503/429 o timeout (hasta `MAX_GEMINI_ATTEMPTS` veces). */
async function callGeminiWithRetry(url: string, body: string): Promise<Response> {
  let lastResponse: Response | undefined;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt++) {
    try {
      const response = await fetchGeminiWithTimeout(url, body);
      if (response.ok || !RETRYABLE_STATUSES.has(response.status)) {
        return response;
      }
      lastResponse = response;
    } catch (error) {
      // Timeout (AbortError) u otro corte de red — tratado como transitorio, igual que 503/429.
      lastError = error;
    }

    if (attempt < MAX_GEMINI_ATTEMPTS) {
      await sleep(RETRY_DELAYS_MS[attempt - 1]);
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError ?? new Error("Gemini no respondió.");
}

export default {
  async fetch(req: Request): Promise<Response> {
    const cors = corsHeaders(req.headers.get("origin"));

    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: cors });
    }

    if (req.method !== "POST") {
      return errorResponse("Método no permitido.", 405, cors);
    }

    let pdfBase64: unknown;
    try {
      ({ pdfBase64 } = await req.json());
    } catch {
      return errorResponse("Body inválido: se esperaba JSON.", 400, cors);
    }

    if (typeof pdfBase64 !== "string" || !pdfBase64) {
      return errorResponse("Falta pdfBase64 en el body.", 400, cors);
    }

    if (pdfBase64.length > MAX_BASE64_LENGTH) {
      return errorResponse("El PDF supera el tamaño máximo permitido (10 MB).", 413, cors);
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return errorResponse("Falta GEMINI_API_KEY en los secretos de la función.", 500, cors);
    }

    const url = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const requestBody = JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text:
              "Sos un analizador de recibos de sueldo argentinos. Extraé el sueldo neto a cobrar " +
              "(el monto final que recibe el empleado, después de descuentos — no el bruto). " +
              "Si el recibo muestra horas extra trabajadas, marcá horas_extras.detectadas en true e " +
              "indicá, si podés leerlos, la cantidad de horas y el monto pagado por ellas; si no hay " +
              "horas extra, marcá horas_extras.detectadas en false y omití el resto de ese campo. " +
              "Si el recibo muestra un descuento por cuota de gimnasio/club (beneficio de la empresa), " +
              "indicá el monto de ese descuento en descuento_gimnasio; si no aparece, omitilo.",
          },
        ],
      },
      contents: [{ parts: [{ inlineData: { mimeType: "application/pdf", data: pdfBase64 } }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: PAYSLIP_RESPONSE_SCHEMA },
    });

    let geminiResponse: Response;
    try {
      geminiResponse = await callGeminiWithRetry(url, requestBody);
    } catch {
      return errorResponse("No se pudo conectar con Gemini.", 502, cors);
    }

    if (!geminiResponse.ok) {
      return errorResponse(`Gemini devolvió ${geminiResponse.status} analizando el recibo.`, 502, cors);
    }

    const data = (await geminiResponse.json()) as {
      candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
    };
    const text = data.candidates?.[0]?.content.parts[0]?.text;
    if (!text) {
      return errorResponse("Gemini no devolvió contenido para este PDF.", 502, cors);
    }

    let payslip: PayslipData;
    try {
      payslip = JSON.parse(text) as PayslipData;
    } catch {
      return errorResponse("Gemini devolvió una respuesta que no se pudo interpretar.", 502, cors);
    }

    return Response.json(payslip, { headers: cors });
  },
};

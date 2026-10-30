// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Pensada para que la invoque un Shortcut de iOS (trigger "Transaction" del
// Wallet), no el navegador — por eso no valida un JWT de sesión como
// parse-invoice. La autorización es un secreto compartido fijo (ver
// SHORTCUT_SECRET más abajo), suficiente para una app personal de un solo
// usuario; no pensado para multi-usuario.
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Headers": "content-type, x-shortcut-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

// Debe ser una categoría válida de EXPENSE_CATEGORIES.FLEXIBLE
// (src/types/finance.ts) — "Tarjeta de Crédito" porque todo lo que llega acá
// se pagó con una tarjeta del Wallet, salvo que el Shortcut mande otra.
const DEFAULT_CATEGORY = "Tarjeta de Crédito";

interface ShortcutPayload {
  amount: number;
  description?: string;
  category?: string;
}

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: corsHeaders });
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return errorResponse("Método no permitido.", 405);
    }

    const expectedSecret = Deno.env.get("SHORTCUT_SECRET");
    const userId = Deno.env.get("SHORTCUT_USER_ID");
    if (!expectedSecret || !userId) {
      return errorResponse(
        "Falta configurar SHORTCUT_SECRET y/o SHORTCUT_USER_ID en los secretos de la función.",
        500,
      );
    }

    if (req.headers.get("x-shortcut-secret") !== expectedSecret) {
      return errorResponse("No autorizado.", 401);
    }

    let body: ShortcutPayload;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Body inválido: se esperaba JSON.", 400);
    }

    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return errorResponse("Falta 'amount' (debe ser un número mayor a 0).", 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Argentina es UTC-3 todo el año (sin horario de verano) — restar 3hs a
    // "ahora" antes de recortar la fecha evita que una compra de noche quede
    // fechada al día siguiente (que pasaría usando la fecha UTC directo).
    const today = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { error } = await supabase.from("expenses").insert({
      user_id: userId,
      amount,
      type: "FLEXIBLE",
      category: body.category?.trim() || DEFAULT_CATEGORY,
      date: today,
      description: body.description?.trim() || "Apple Pay",
      currency: "ARS",
    });

    if (error) {
      return errorResponse(`Error al guardar el gasto: ${error.message}`, 500);
    }

    return Response.json({ ok: true }, { headers: corsHeaders });
  },
};

// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isServiceRoleRequest, requirePermission } from "../_shared/permissions.ts";

// Trae los gastos que el usuario hizo con Mercado Pago (como comprador, no
// como vendedor) usando la API de Reportes de cuenta ("Todas las
// transacciones"), pensada originalmente para que un vendedor concilie su
// saldo. La dispara un cron de Postgres (pg_cron + pg_net, ver migración
// 014) cada 20 minutos — no un usuario ni un navegador, por eso
// verify_jwt=true y se autentica con el service_role key (ver config.toml).
// Además de ese JWT, solo acepta a un usuario con el permiso mp_sync
// (migración 016): cualquier otro JWT válido (anon key, otros usuarios) se
// rechaza, porque esta función opera con el token de MP del dueño.
//
// ⚠️ IMPORTANTE — sin validar contra datos reales todavía: al momento de
// escribir esto, la cuenta de Mercado Pago conectada estaba bloqueada por su
// Policy Agent (PA_UNAUTHORIZED_RESULT_FROM_POLICIES) incluso en endpoints
// básicos como /users/me, así que no se pudo generar ni inspeccionar un
// reporte real. Dos cosas quedan basadas en la documentación oficial, no en
// un reporte verdadero, y hay que confirmarlas apenas la cuenta se
// desbloquee (ver `clasificarMovimiento` más abajo y el parseo de CSV):
//   1. Qué valor exacto de TRANSACTION_TYPE identifica "vos pagaste algo"
//      (el glosario de MP solo confirma SETTLEMENT=ingreso por venta y
//      WITHDRAWAL/REFUND/CHARGEBACK=egreso — ninguno describe claramente
//      "compra hecha por el titular de la cuenta").
//   2. El delimitador real del CSV (la doc muestra tanto coma como ";" en
//      distintos ejemplos) — por eso se autodetecta en vez de asumir uno.

const MP_API_BASE = "https://api.mercadopago.com";

// Si nunca se sincronizó nada, cuánto para atrás mirar en la primera corrida.
const INITIAL_LOOKBACK_DAYS = 30;

// Si una generación de reporte pedida a MP sigue sin aparecer lista después
// de esto, se abandona (se limpia el estado "pending") y se vuelve a pedir
// desde cero en la corrida siguiente — mejor que quedar trabado para siempre
// si MP nunca la terminó de generar.
const PENDING_TIMEOUT_HOURS = 24;

// Categoría/tipo genéricos para todo lo que llega por este camino — a
// diferencia del Shortcut de Apple Pay (que siempre es tarjeta de crédito),
// Mercado Pago puede pagarse con dinero en cuenta, débito o crédito, así que
// no hay una categoría FIJO/FLEXIBLE más específica que asumir sin adivinar.
const DEFAULT_TYPE = "FLEXIBLE";
const DEFAULT_CATEGORY = "Otros";

// Confirmado por el glosario oficial de MP como egreso/ingreso real. Lo que
// no está en ninguna de las dos listas se loguea y NO se inserta — ver nota
// arriba sobre por qué este mapeo es provisorio.
const KNOWN_OUTGOING_TYPES = new Set(["WITHDRAWAL", "REFUND", "CHARGEBACK"]);
const KNOWN_INCOMING_TYPES = new Set(["SETTLEMENT"]);

interface SyncState {
  id: number;
  last_synced_until: string | null;
  pending_begin_date: string | null;
  pending_end_date: string | null;
  pending_requested_at: string | null;
}

interface ReportListItem {
  file_name?: string;
  begin_date?: string;
  end_date?: string;
}

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

function toMpDate(d: Date): string {
  return d.toISOString().slice(0, 10) + "T00:00:00Z";
}

/** Mismo criterio de fecha que `log-apple-pay-expense`: Argentina es UTC-3 todo el año. */
function toArgentineDateOnly(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  return new Date(d.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Parser de CSV mínimo pero que soporta campos entre comillas (DESCRIPTION /
 * PAYER_NAME pueden traer el delimitador adentro). Autodetecta ',' vs ';'
 * mirando la primera línea — la doc oficial de MP muestra los dos según el
 * ejemplo, y no hay forma de confirmar cuál usa esta cuenta sin un reporte real.
 */
function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r\n|\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";

  function parseLine(line: string): string[] {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current);
    return fields;
  }

  const header = parseLine(lines[0]).map((h) => h.trim().toUpperCase());
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    header.forEach((key, idx) => {
      row[key] = (values[idx] ?? "").trim();
    });
    return row;
  });
}

type Clasificacion = "EGRESO" | "INGRESO" | "DESCONOCIDO";

function clasificarMovimiento(transactionType: string): Clasificacion {
  const t = transactionType.trim().toUpperCase();
  if (KNOWN_OUTGOING_TYPES.has(t)) return "EGRESO";
  if (KNOWN_INCOMING_TYPES.has(t)) return "INGRESO";
  return "DESCONOCIDO";
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method !== "POST") {
      return errorResponse("Método no permitido.", 405);
    }

    if (!isServiceRoleRequest(req)) {
      const auth = await requirePermission(req, "mp_sync");
      if (!auth.ok) {
        return errorResponse(auth.message, auth.status);
      }
    }

    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN");
    const syncUserId = Deno.env.get("MP_SYNC_USER_ID");
    if (!mpAccessToken || !syncUserId) {
      return errorResponse(
        "Falta configurar MP_ACCESS_TOKEN y/o MP_SYNC_USER_ID en los secretos de la función.",
        500,
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: state, error: stateError } = await supabase
      .from("mp_report_sync")
      .select("*")
      .eq("id", 1)
      .single<SyncState>();

    if (stateError || !state) {
      return errorResponse(`No se pudo leer mp_report_sync: ${stateError?.message}`, 500);
    }

    const mpHeaders = { Authorization: `Bearer ${mpAccessToken}` };

    // --- Caso 1: hay una generación de reporte pendiente en MP ---
    if (state.pending_begin_date && state.pending_end_date && state.pending_requested_at) {
      const requestedAt = new Date(state.pending_requested_at);
      const hoursSinceRequest = (Date.now() - requestedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceRequest > PENDING_TIMEOUT_HOURS) {
        await supabase
          .from("mp_report_sync")
          .update({
            pending_begin_date: null,
            pending_end_date: null,
            pending_requested_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1);
        return Response.json({
          status: "pending_abandonado",
          message: `El reporte pedido el ${state.pending_requested_at} nunca apareció listo. Se reintentará desde cero en la próxima corrida.`,
        });
      }

      const listResponse = await fetch(`${MP_API_BASE}/v1/account/settlement_report/list`, {
        headers: mpHeaders,
      });
      if (!listResponse.ok) {
        return errorResponse(
          `MP devolvió ${listResponse.status} listando reportes.`,
          502,
        );
      }

      const reports = (await listResponse.json()) as ReportListItem[];
      const match = reports.find(
        (r) =>
          r.begin_date?.slice(0, 10) === state.pending_begin_date &&
          r.end_date?.slice(0, 10) === state.pending_end_date &&
          r.file_name,
      );

      if (!match) {
        return Response.json({
          status: "pendiente",
          message: "El reporte todavía no aparece en la lista de MP. Se reintenta en la próxima corrida.",
        });
      }

      const fileResponse = await fetch(
        `${MP_API_BASE}/v1/account/settlement_report/${match.file_name}`,
        { headers: mpHeaders },
      );

      if (!fileResponse.ok) {
        // Puede estar en la lista pero todavía no generado del todo — se
        // reintenta en la próxima corrida en vez de asumir error definitivo.
        return Response.json({
          status: "pendiente",
          message: `El archivo ${match.file_name} todavía no se puede descargar (HTTP ${fileResponse.status}).`,
        });
      }

      const csvText = await fileResponse.text();
      const rows = parseCsv(csvText);

      const unknownTypes = new Set<string>();
      const candidates: Array<{
        amount: number;
        type: string;
        category: string;
        date: string;
        description: string;
        currency: string;
        card_import_ref: string;
      }> = [];

      for (const row of rows) {
        const transactionType = row["TRANSACTION_TYPE"] ?? "";
        const clasificacion = clasificarMovimiento(transactionType);
        if (clasificacion !== "EGRESO") {
          if (clasificacion === "DESCONOCIDO" && transactionType) {
            unknownTypes.add(transactionType);
          }
          continue;
        }

        const currency = (row["TRANSACTION_CURRENCY"] ?? "").toUpperCase();
        if (currency !== "ARS" && currency !== "USD") continue;

        const amountRaw = Number(row["TRANSACTION_AMOUNT"]);
        if (!amountRaw) continue;

        const sourceId = row["SOURCE_ID"] || row["ORDER_ID"];
        if (!sourceId) continue;

        const transactionDate = row["TRANSACTION_DATE"];
        if (!transactionDate) continue;

        candidates.push({
          amount: Math.abs(amountRaw),
          type: DEFAULT_TYPE,
          category: DEFAULT_CATEGORY,
          date: toArgentineDateOnly(transactionDate),
          description: `Mercado Pago: ${row["DESCRIPTION"] || row["PAYMENT_METHOD"] || "Movimiento"}`.trim(),
          currency,
          card_import_ref: `mp:${sourceId}`,
        });
      }

      let inserted = 0;
      if (candidates.length > 0) {
        const refs = candidates.map((c) => c.card_import_ref);
        const { data: existing, error: existingError } = await supabase
          .from("expenses")
          .select("card_import_ref")
          .eq("user_id", syncUserId)
          .in("card_import_ref", refs);

        if (existingError) {
          return errorResponse(`Error chequeando duplicados: ${existingError.message}`, 500);
        }

        const existingRefs = new Set((existing ?? []).map((e) => e.card_import_ref));
        const toInsert = candidates
          .filter((c) => !existingRefs.has(c.card_import_ref))
          .map((c) => ({ ...c, user_id: syncUserId }));

        if (toInsert.length > 0) {
          const { error: insertError } = await supabase.from("expenses").insert(toInsert);
          if (insertError) {
            return errorResponse(`Error insertando gastos: ${insertError.message}`, 500);
          }
          inserted = toInsert.length;
        }
      }

      await supabase
        .from("mp_report_sync")
        .update({
          last_synced_until: state.pending_end_date,
          pending_begin_date: null,
          pending_end_date: null,
          pending_requested_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);

      return Response.json({
        status: "sincronizado",
        gastos_insertados: inserted,
        filas_en_reporte: rows.length,
        transaction_types_no_reconocidos: Array.from(unknownTypes),
      });
    }

    // --- Caso 2: no hay nada pendiente, ver si hace falta pedir un reporte nuevo ---
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const beginDate = state.last_synced_until
      ? new Date(state.last_synced_until)
      : (() => {
          const d = new Date(today);
          d.setUTCDate(d.getUTCDate() - INITIAL_LOOKBACK_DAYS);
          return d;
        })();

    // No se pide el día de hoy: todavía puede sumar movimientos que no
    // terminaron de liquidarse del lado de MP.
    if (beginDate >= yesterday) {
      return Response.json({
        status: "al_dia",
        message: "No hay rango nuevo que sincronizar todavía.",
      });
    }

    const generateResponse = await fetch(`${MP_API_BASE}/v1/account/settlement_report`, {
      method: "POST",
      headers: { ...mpHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        begin_date: toMpDate(beginDate),
        end_date: toMpDate(yesterday),
      }),
    });

    if (!generateResponse.ok) {
      const body = await generateResponse.text();
      return errorResponse(
        `MP devolvió ${generateResponse.status} generando el reporte: ${body}`,
        502,
      );
    }

    await supabase
      .from("mp_report_sync")
      .update({
        pending_begin_date: beginDate.toISOString().slice(0, 10),
        pending_end_date: yesterday.toISOString().slice(0, 10),
        pending_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    return Response.json({
      status: "reporte_pedido",
      begin_date: beginDate.toISOString().slice(0, 10),
      end_date: yesterday.toISOString().slice(0, 10),
    });
  },
};

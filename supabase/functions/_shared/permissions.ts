import { createClient } from "npm:@supabase/supabase-js@2";

// Permisos definidos en el enum public.app_permission (migración 016).
export type AppPermission = "invoice_ai" | "mp_sync";

export type AuthCheck =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; message: string };

function bearerToken(req: Request): string | null {
  const header = req.headers.get("Authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Exige un usuario con sesión iniciada y con el permiso indicado.
 *
 * `verify_jwt = true` en config.toml NO alcanza: la anon key (pública, viaja
 * en el bundle del frontend) también es un JWT válido. Por eso acá se valida
 * que el token sea de un usuario real (`auth.getUser`) y que tenga el permiso
 * (`has_permission`, que corre con el JWT del usuario y respeta RLS).
 */
export async function requirePermission(req: Request, permission: AppPermission): Promise<AuthCheck> {
  const token = bearerToken(req);
  if (!token) {
    return { ok: false, status: 401, message: "Falta el token de sesión." };
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return { ok: false, status: 401, message: "Sesión inválida o vencida." };
  }

  const { data: allowed, error: permError } = await supabase.rpc("has_permission", { p: permission });
  if (permError) {
    return { ok: false, status: 403, message: "No se pudieron verificar tus permisos." };
  }
  if (allowed !== true) {
    return { ok: false, status: 403, message: "Tu usuario no tiene habilitada esta función." };
  }

  return { ok: true, userId: userData.user.id };
}

/** Comparación en tiempo constante, para no filtrar el secreto por timing. */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

/** true si la request trae el service_role key como Bearer (así llama el cron de Postgres). */
export function isServiceRoleRequest(req: Request): boolean {
  const token = bearerToken(req);
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return Boolean(token && serviceKey && safeEqual(token, serviceKey));
}

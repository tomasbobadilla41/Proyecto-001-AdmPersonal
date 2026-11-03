-- ============================================
-- Migración 014: Cron de sincronización de gastos de Mercado Pago
-- ============================================
-- Dispara `sync-mercadopago-expenses` cada 20 minutos. El reporte de MP se
-- genera asíncronamente del lado de ellos (sin SLA documentado), así que
-- esta frecuencia funciona como "polling": cada corrida avanza un paso en
-- la máquina de estados de `mp_report_sync` (pedir reporte -> esperar ->
-- bajar e insertar) — no asume que el reporte esté listo en la misma
-- corrida en que se pidió.
--
-- ⚠️ Prerequisito manual, una sola vez, desde el SQL Editor del dashboard de
-- Supabase (NUNCA desde un commit ni desde esta migración): guardar el
-- service_role key en Vault, que es lo que este cron manda como Bearer
-- token contra la función (la función tiene verify_jwt=true, ver
-- supabase/config.toml):
--
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
--
-- Reemplazar <SERVICE_ROLE_KEY> por el valor real de Project Settings > API.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'sync-mercadopago-expenses',
  '*/20 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fzzyvvfmukgvlqweibdg.supabase.co/functions/v1/sync-mercadopago-expenses',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

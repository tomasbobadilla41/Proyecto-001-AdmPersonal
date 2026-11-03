-- ============================================
-- Migración 013: Estado de sincronización de reportes de Mercado Pago
-- ============================================
-- Fila única (app de un solo usuario) que lleva el estado de la máquina de
-- sincronización de la Edge Function `sync-mercadopago-expenses`: hasta qué
-- fecha ya se importaron gastos, y si hay una generación de reporte
-- pendiente del lado de Mercado Pago.
--
-- La generación del reporte es asíncrona y sin SLA documentado por MP, así
-- que no se puede esperar bloqueado dentro de una sola invocación de la
-- función — esta tabla es lo que permite "pedir ahora, revisar en la
-- corrida siguiente" sin perder el estado entre invocaciones.
CREATE TABLE IF NOT EXISTS mp_report_sync (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_synced_until DATE,
  pending_begin_date DATE,
  pending_end_date DATE,
  pending_requested_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

INSERT INTO mp_report_sync (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Solo la Edge Function (service role) la toca — no es un dato que el
-- usuario consulte desde el frontend. RLS sin policies deniega todo acceso
-- vía anon/authenticated; el service role la bypassea igual.
ALTER TABLE mp_report_sync ENABLE ROW LEVEL SECURITY;

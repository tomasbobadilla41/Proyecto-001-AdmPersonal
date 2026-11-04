-- ============================================
-- Migración 015: Registro de llamadas al endpoint de Apple Pay
-- ============================================
-- Cada invocación de la Edge Function `log-apple-pay-expense` (la que llama
-- el Shortcut de iOS) deja una fila acá, salga bien o mal. Sirve para saber
-- qué mandó exactamente el Shortcut y por qué falló, sin depender de los logs
-- de Supabase (que se borran solos y no guardan el body).
--
-- Por seguridad nunca se guardan headers ni el secreto. En los 401 (secreto
-- incorrecto) tampoco se guarda el body, para que nadie de afuera pueda
-- escribir contenido arbitrario en la tabla.
CREATE TABLE IF NOT EXISTS apple_pay_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  status SMALLINT NOT NULL,
  -- Body tal cual llegó (JSON). Si no era JSON válido: {"raw": "<texto>"}.
  payload JSONB,
  -- Monto interpretado por parseAmount(); NULL si no se pudo interpretar.
  parsed_amount NUMERIC,
  error TEXT,
  -- Gasto creado, si la llamada salió bien. SET NULL para no perder el
  -- registro si después se borra el gasto.
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS apple_pay_requests_user_received_idx
  ON apple_pay_requests (user_id, received_at DESC);

-- La escribe solo la Edge Function (service role, que bypassea RLS). Desde
-- el frontend el usuario solo puede leer sus propias filas.
ALTER TABLE apple_pay_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver propias llamadas de Apple Pay" ON apple_pay_requests
  FOR SELECT USING (auth.uid() = user_id);

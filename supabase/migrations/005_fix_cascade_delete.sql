-- Agrega ON DELETE CASCADE a todas las FK hacia auth.users que quedaron sin
-- ella (incomes, exchange_rates, portfolio_holdings, payment_services, y
-- expenses por las dudas, ya que se creó antes de esta convención de
-- archivo). No borra ni modifica ningún dato existente.
--
-- Si algún nombre de constraint no coincide (Postgres los nombra
-- automáticamente como <tabla>_<columna>_fkey al hacer un REFERENCES sin
-- nombre explícito), corré primero esto para ver el nombre real:
--   SELECT conname, conrelid::regclass FROM pg_constraint WHERE contype = 'f' AND confrelid = 'auth.users'::regclass;

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_user_id_fkey;
ALTER TABLE expenses ADD CONSTRAINT expenses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE incomes DROP CONSTRAINT IF EXISTS incomes_user_id_fkey;
ALTER TABLE incomes ADD CONSTRAINT incomes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE exchange_rates DROP CONSTRAINT IF EXISTS exchange_rates_user_id_fkey;
ALTER TABLE exchange_rates ADD CONSTRAINT exchange_rates_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE portfolio_holdings DROP CONSTRAINT IF EXISTS portfolio_holdings_user_id_fkey;
ALTER TABLE portfolio_holdings ADD CONSTRAINT portfolio_holdings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE payment_services DROP CONSTRAINT IF EXISTS payment_services_user_id_fkey;
ALTER TABLE payment_services ADD CONSTRAINT payment_services_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

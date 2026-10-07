-- ============================================
-- Tabla de inversiones (cripto + CEDEARs) — un registro por compra
-- ============================================
CREATE TABLE portfolio_holdings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('crypto', 'cedear')),
  ticker TEXT NOT NULL,
  amount_invested NUMERIC NOT NULL,
  purchase_price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('ARS', 'USD')),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver propias inversiones" ON portfolio_holdings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insertar propias inversiones" ON portfolio_holdings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar propias inversiones" ON portfolio_holdings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eliminar propias inversiones" ON portfolio_holdings FOR DELETE USING (auth.uid() = user_id);

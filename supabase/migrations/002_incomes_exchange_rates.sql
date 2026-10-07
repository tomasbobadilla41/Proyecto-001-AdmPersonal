-- ============================================
-- 1. Tabla de ingresos (sueldo) por mes/año
-- ============================================
CREATE TABLE incomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  salary_ars NUMERIC NOT NULL DEFAULT 0,
  salary_usd NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE (user_id, month, year)
);

ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver propios ingresos" ON incomes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insertar propios ingresos" ON incomes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar propios ingresos" ON incomes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eliminar propios ingresos" ON incomes FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 2. Tabla de cotización del dólar por mes/año
-- ============================================
CREATE TABLE exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  rate NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE (user_id, month, year)
);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver propia cotizacion" ON exchange_rates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insertar propia cotizacion" ON exchange_rates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar propia cotizacion" ON exchange_rates FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eliminar propia cotizacion" ON exchange_rates FOR DELETE USING (auth.uid() = user_id);

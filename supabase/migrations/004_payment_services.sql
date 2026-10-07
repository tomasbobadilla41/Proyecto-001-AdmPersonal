-- ============================================
-- Tabla del directorio de servicios (Centro de Pagos)
-- ============================================
CREATE TABLE payment_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  category TEXT NOT NULL,
  account_number TEXT NOT NULL,
  payment_link TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE payment_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver propios servicios" ON payment_services FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insertar propios servicios" ON payment_services FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar propios servicios" ON payment_services FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eliminar propios servicios" ON payment_services FOR DELETE USING (auth.uid() = user_id);

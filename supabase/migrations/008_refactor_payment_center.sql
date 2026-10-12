-- ============================================
-- Migración 008: Refactor del Centro de Pagos
-- ============================================
-- Reemplaza `payment_services` (un registro = un link/CBU por categoría) por
-- una arquitectura relacional que separa el Catálogo de Servicios Fijos de
-- los Pagos Mensuales (`expenses`), y deja `sender_email` preparado para una
-- futura automatización de lectura de facturas por email.
-- No había datos para migrar (tabla vacía en producción), así que se dropea
-- directo en vez de copiar filas.

DROP TABLE IF EXISTS payment_services;

CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- Acotado a FixedExpenseCategory en types/finance.ts
  account_number TEXT,
  payment_link TEXT,
  sender_email TEXT, -- Fundamental para futura integración con Gmail
  due_day INTEGER CHECK (due_day >= 1 AND due_day <= 31),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver propios servicios" ON services FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insertar propios servicios" ON services FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar propios servicios" ON services FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eliminar propios servicios" ON services FOR DELETE USING (auth.uid() = user_id);

-- ON DELETE SET NULL (no CASCADE): si se borra el servicio del catálogo, el
-- gasto histórico queda (con category/description propios), solo pierde el
-- vínculo al catálogo — mismo patrón que `property_expenses` en Inmuebles.
ALTER TABLE expenses ADD COLUMN service_id UUID REFERENCES services(id) ON DELETE SET NULL;

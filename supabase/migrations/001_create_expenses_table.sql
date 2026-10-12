-- ============================================
-- Migración 001: Tabla principal de Gastos (expenses)
-- ============================================
-- Documenta el esquema real de la tabla `expenses`, creada originalmente a
-- mano desde el dashboard de Supabase (antes de adoptar la convención de
-- versionar el SQL en este directorio). Columnas confirmadas contra la
-- tabla en producción vía information_schema.columns.

CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL, -- 'FIJO' | 'FLEXIBLE' (ver types/finance.ts -> ExpenseType)
  category TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'ARS',
  subcategory TEXT,
  recurring_group_id TEXT, -- Vincula compras en cuotas/recurrentes (utils/installments.ts)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad: el usuario solo puede interactuar con sus propios registros
CREATE POLICY "Ver propios gastos" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insertar propios gastos" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar propios gastos" ON expenses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eliminar propios gastos" ON expenses FOR DELETE USING (auth.uid() = user_id);

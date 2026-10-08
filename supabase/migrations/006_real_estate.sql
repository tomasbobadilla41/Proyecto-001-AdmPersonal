-- ============================================
-- Módulo de Inmuebles: 5 tablas relacionadas
-- ============================================

-- 1. Propiedades (raíz de la jerarquía)
CREATE TABLE properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver propias propiedades" ON properties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insertar propias propiedades" ON properties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar propias propiedades" ON properties FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eliminar propias propiedades" ON properties FOR DELETE USING (auth.uid() = user_id);

-- 2. Configuración de servicios de cada propiedad
CREATE TABLE property_service_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  is_auto_debit BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE property_service_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver propios servicios de propiedad" ON property_service_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insertar propios servicios de propiedad" ON property_service_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar propios servicios de propiedad" ON property_service_configs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eliminar propios servicios de propiedad" ON property_service_configs FOR DELETE USING (auth.uid() = user_id);

-- 3. Gastos mensuales de cada propiedad (service_config_id es una relación
--    "blanda": si se borra el servicio, el gasto sobrevive con su snapshot
--    de service_name — por eso ON DELETE SET NULL, no CASCADE).
CREATE TABLE property_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  service_config_id UUID REFERENCES property_service_configs(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PAID', 'PENDING', 'AUTO_DEBIT')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE property_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver propios gastos de propiedad" ON property_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insertar propios gastos de propiedad" ON property_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar propios gastos de propiedad" ON property_expenses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eliminar propios gastos de propiedad" ON property_expenses FOR DELETE USING (auth.uid() = user_id);

-- 4. Alquiler cobrado por mes/propiedad
CREATE TABLE property_incomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('ARS', 'USD')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE property_incomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver propios ingresos de propiedad" ON property_incomes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insertar propios ingresos de propiedad" ON property_incomes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar propios ingresos de propiedad" ON property_incomes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eliminar propios ingresos de propiedad" ON property_incomes FOR DELETE USING (auth.uid() = user_id);

-- 5. Contratos de alquiler
CREATE TABLE lease_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  initial_rent_amount NUMERIC NOT NULL,
  current_rent_amount NUMERIC NOT NULL,
  update_frequency_months INTEGER NOT NULL,
  index_type TEXT NOT NULL CHECK (index_type IN ('IPC', 'ICL', 'FIJO')),
  base_index_value NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE lease_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver propios contratos" ON lease_contracts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insertar propios contratos" ON lease_contracts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar propios contratos" ON lease_contracts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eliminar propios contratos" ON lease_contracts FOR DELETE USING (auth.uid() = user_id);

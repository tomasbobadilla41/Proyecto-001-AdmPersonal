-- ============================================
-- Migración 009: Pertenencia cruzada en políticas RLS
-- ============================================
-- Hasta ahora el WITH CHECK de INSERT/UPDATE en tablas hijas solo validaba
-- `auth.uid() = user_id`, sin confirmar que la FK referenciada (property_id,
-- service_id) perteneciera a ese mismo usuario. El frontend nunca manda IDs
-- ajenos, pero a nivel de base de datos conviene no depender solo de eso:
-- sin este check, un usuario autenticado que adivine/filtre el UUID de una
-- propiedad o servicio ajeno podría asociar sus propios gastos/ingresos a
-- ese registro ajeno.

-- 1. property_service_configs.property_id -> properties
DROP POLICY IF EXISTS "Insertar propios servicios de propiedad" ON property_service_configs;
DROP POLICY IF EXISTS "Actualizar propios servicios de propiedad" ON property_service_configs;

CREATE POLICY "Insertar propios servicios de propiedad" ON property_service_configs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  );

CREATE POLICY "Actualizar propios servicios de propiedad" ON property_service_configs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  );

-- 2. property_expenses.property_id -> properties
DROP POLICY IF EXISTS "Insertar propios gastos de propiedad" ON property_expenses;
DROP POLICY IF EXISTS "Actualizar propios gastos de propiedad" ON property_expenses;

CREATE POLICY "Insertar propios gastos de propiedad" ON property_expenses
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  );

CREATE POLICY "Actualizar propios gastos de propiedad" ON property_expenses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  );

-- 3. property_incomes.property_id -> properties
DROP POLICY IF EXISTS "Insertar propios ingresos de propiedad" ON property_incomes;
DROP POLICY IF EXISTS "Actualizar propios ingresos de propiedad" ON property_incomes;

CREATE POLICY "Insertar propios ingresos de propiedad" ON property_incomes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  );

CREATE POLICY "Actualizar propios ingresos de propiedad" ON property_incomes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  );

-- 4. lease_contracts.property_id -> properties
DROP POLICY IF EXISTS "Insertar propios contratos" ON lease_contracts;
DROP POLICY IF EXISTS "Actualizar propios contratos" ON lease_contracts;

CREATE POLICY "Insertar propios contratos" ON lease_contracts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  );

CREATE POLICY "Actualizar propios contratos" ON lease_contracts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  );

-- 5. expenses.service_id -> services (nullable: el gasto puede no venir del catálogo)
DROP POLICY IF EXISTS "Insertar propios gastos" ON expenses;
DROP POLICY IF EXISTS "Actualizar propios gastos" ON expenses;

CREATE POLICY "Insertar propios gastos" ON expenses
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (service_id IS NULL OR EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.user_id = auth.uid()))
  );

CREATE POLICY "Actualizar propios gastos" ON expenses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
    auth.uid() = user_id
    AND (service_id IS NULL OR EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.user_id = auth.uid()))
  );

-- 6. services.payment_link: solo http(s). El frontend ya valida esto antes
-- de guardar y al renderizar, pero un `javascript:...` guardado por fuera de
-- la UI (import directo, otro cliente) se ejecutaría igual al hacer clic.
ALTER TABLE services ADD CONSTRAINT services_payment_link_http_check
  CHECK (payment_link IS NULL OR payment_link ~* '^https?://');


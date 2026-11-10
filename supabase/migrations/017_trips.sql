-- ============================================
-- Migración 017: Módulo de Vacaciones (viajes y sus gastos)
-- ============================================
-- `trips` es un viaje (ej: "Salta 2026") y `trip_expenses` cada gasto del
-- viaje (vuelo, hospedaje, alquiler de auto...), con quién lo pagó (el
-- usuario, su pareja o mitad cada uno). El reparto entre la pareja es
-- siempre 50/50.
--
-- Cada `trip_expense` PAGADO genera además uno o varios `expenses`
-- (categoría FLEXIBLE 'Vacaciones', uno por cuota) por la parte que el
-- usuario puso de su bolsillo, para que el gasto impacte en Gastos y en la
-- regla 50/30/20 del mes en que se paga. Esos `expenses` quedan vinculados
-- por `expenses.trip_expense_id` y se borran en cascada con el gasto del
-- viaje (y este, con el viaje).

-- 1. Viajes
CREATE TABLE trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  -- Presupuesto opcional: o vienen los dos campos, o ninguno.
  budget_amount NUMERIC CHECK (budget_amount IS NULL OR budget_amount > 0),
  budget_currency TEXT CHECK (budget_currency IS NULL OR budget_currency IN ('ARS', 'USD')),
  -- Nombre con el que se muestra a la pareja (ej: "Sofi"); si es NULL, la UI usa "Pareja".
  partner_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT trips_dates_check CHECK (end_date >= start_date),
  CONSTRAINT trips_budget_pair_check CHECK ((budget_amount IS NULL) = (budget_currency IS NULL))
);

CREATE INDEX trips_user_id_idx ON trips (user_id);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver propios viajes" ON trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insertar propios viajes" ON trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar propios viajes" ON trips FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eliminar propios viajes" ON trips FOR DELETE USING (auth.uid() = user_id);

-- 2. Gastos de cada viaje
CREATE TABLE trip_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (
    category IN ('Vuelo', 'Hospedaje', 'Alquiler de auto', 'Comida', 'Excursiones', 'Transporte', 'Otros')
  ),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency IN ('ARS', 'USD')),
  -- Fecha en que se pagó (o en que vence, si todavía está PENDIENTE).
  payment_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PAGADO', 'PENDIENTE')),
  paid_by TEXT NOT NULL CHECK (paid_by IN ('YO', 'PAREJA', 'COMPARTIDO')),
  installments INTEGER NOT NULL DEFAULT 1 CHECK (installments BETWEEN 1 AND 24),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX trip_expenses_trip_id_idx ON trip_expenses (trip_id);

ALTER TABLE trip_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver propios gastos de viaje" ON trip_expenses FOR SELECT USING (auth.uid() = user_id);
-- Pertenencia cruzada (mismo criterio que la migración 009): el viaje
-- referenciado también tiene que ser del usuario.
CREATE POLICY "Insertar propios gastos de viaje" ON trip_expenses
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
  );
CREATE POLICY "Actualizar propios gastos de viaje" ON trip_expenses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
  );
CREATE POLICY "Eliminar propios gastos de viaje" ON trip_expenses FOR DELETE USING (auth.uid() = user_id);

-- 3. Vínculo expenses -> trip_expenses
ALTER TABLE expenses
  ADD COLUMN trip_expense_id UUID REFERENCES trip_expenses(id) ON DELETE CASCADE;

CREATE INDEX expenses_trip_expense_id_idx ON expenses (trip_expense_id) WHERE trip_expense_id IS NOT NULL;

-- 4. Nueva categoría FLEXIBLE 'Vacaciones' (sincronizada a mano con
--    EXPENSE_CATEGORIES en src/types/finance.ts — ver migración 011).
ALTER TABLE expenses DROP CONSTRAINT expenses_category_check;
ALTER TABLE expenses
  ADD CONSTRAINT expenses_category_check CHECK (
    category IN (
      -- FIJO (EXPENSE_CATEGORIES.FIJO)
      'Alquiler',
      'Expensas',
      'Obra Social',
      'ABL',
      'Edenor',
      'Metrogas',
      'Internet/Teléfono',
      'Seguro Auto',
      'Patente',
      'Gimnasio',
      'Streaming (Netflix, YT)',
      -- FLEXIBLE (EXPENSE_CATEGORIES.FLEXIBLE)
      'Supermercado',
      'Cenas/Salidas',
      'Compras',
      'Nafta',
      'Vacaciones',
      'Tarjeta de Crédito',
      'Otros'
    )
  );

-- 5. Políticas de expenses: se suma el check de pertenencia de
--    trip_expense_id al que ya existía para service_id (migración 009).
DROP POLICY IF EXISTS "Insertar propios gastos" ON expenses;
DROP POLICY IF EXISTS "Actualizar propios gastos" ON expenses;

CREATE POLICY "Insertar propios gastos" ON expenses
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (service_id IS NULL OR EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.user_id = auth.uid()))
    AND (trip_expense_id IS NULL OR EXISTS (
      SELECT 1 FROM trip_expenses te WHERE te.id = trip_expense_id AND te.user_id = auth.uid()
    ))
  );

CREATE POLICY "Actualizar propios gastos" ON expenses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
    auth.uid() = user_id
    AND (service_id IS NULL OR EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.user_id = auth.uid()))
    AND (trip_expense_id IS NULL OR EXISTS (
      SELECT 1 FROM trip_expenses te WHERE te.id = trip_expense_id AND te.user_id = auth.uid()
    ))
  );

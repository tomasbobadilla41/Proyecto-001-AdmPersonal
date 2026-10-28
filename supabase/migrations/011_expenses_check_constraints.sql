-- ============================================
-- Migración 009: CHECK constraints en expenses
-- ============================================
-- `expenses` es la tabla más central de la app y quedó como la única sin
-- validación a nivel de Postgres para `type`/`category`/`currency` (son
-- TEXT libres, validados solo en TypeScript del lado del cliente) —
-- detectado en una auditoría de arquitectura. El resto de las tablas más
-- nuevas (portfolio_holdings, services, etc.) ya tienen este tipo de CHECK.
--
-- La lista de `category` tiene que quedar sincronizada a mano con
-- `EXPENSE_CATEGORIES` en src/types/finance.ts — si se agrega una categoría
-- nueva ahí, hace falta otra migración para sumarla acá también.

ALTER TABLE expenses
  ADD CONSTRAINT expenses_type_check CHECK (type IN ('FIJO', 'FLEXIBLE'));

ALTER TABLE expenses
  ADD CONSTRAINT expenses_currency_check CHECK (currency IN ('ARS', 'USD'));

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
      'Tarjeta de Crédito',
      'Otros'
    )
  );

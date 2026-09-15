import type { Currency } from './money'

/** Si un gasto es fijo (recurrente, comprometido) o flexible (variable, discrecional) — regla 50/30/20. */
export type ExpenseType = 'FIJO' | 'FLEXIBLE'

/**
 * Subcategorías de gasto, agrupadas según sean Fijas o Flexibles. Fuente
 * única de verdad: `ExpenseCategory` (abajo) y las opciones de cada select
 * del formulario se derivan de este mismo objeto, así no pueden desincronizarse.
 */
export const EXPENSE_CATEGORIES = {
  FIJO: [
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
  ],
  FLEXIBLE: ['Supermercado', 'Cenas/Salidas', 'Compras', 'Nafta', 'Tarjeta de Crédito', 'Otros'],
} as const satisfies Record<ExpenseType, readonly string[]>

export type FixedExpenseCategory = (typeof EXPENSE_CATEGORIES.FIJO)[number]
export type FlexibleExpenseCategory = (typeof EXPENSE_CATEGORIES.FLEXIBLE)[number]

/** Subcategoría de gasto: unión de las categorías Fijas y Flexibles. */
export type ExpenseCategory = FixedExpenseCategory | FlexibleExpenseCategory

export interface Expense {
  id: string
  fecha: Date
  descripcion: string
  monto: number
  moneda: Currency
  /** FIJO o FLEXIBLE — ver `EXPENSE_CATEGORIES`. */
  expenseType: ExpenseType
  /** Subcategoría dentro de `expenseType` (ej: 'Expensas', dentro de FIJO). */
  category: ExpenseCategory
  /** Detalle opcional dentro de la categoría (ej: en Streaming, qué servicio puntual: Netflix, YT Premium...). */
  subcategoria?: string
}

export interface Income {
  id: string
  /** Mes calendario, 1 (enero) a 12 (diciembre). */
  mes: number
  anio: number
  sueldoARS: number
  sueldoUSD: number
}

/** Cotización ARS/USD que el usuario cargó para un mes puntual. */
export interface ExchangeRate {
  id: string
  mes: number
  anio: number
  /** Cuántos ARS equivalen a 1 USD. */
  valor: number
}

export type InvestmentType = 'CEDEAR' | 'MEP' | 'Crypto' | 'ON' | 'FCI'

export interface InvestmentPosition {
  id: string
  ticker: string
  tipo: InvestmentType
  cantidad: number
  precioCompraPromedio: number
  precioActual: number
  moneda: Currency
}

/**
 * Configuración de pago de un servicio fijo (ej: Edenor, Expensas), para el
 * Directorio de Servicios. `category` queda acotado a las subcategorías de
 * Gastos Fijos (`FixedExpenseCategory`), no a cualquier `ExpenseCategory`.
 */
export interface ServiceConfig {
  id: string
  category: FixedExpenseCategory
  /** Nro de cliente, CBU, o el identificador que pida ese servicio para pagar. */
  accountNumber: string
  /** URL de pago (home banking, billetera, sitio del proveedor, etc.). */
  paymentLink: string
}

/** Resumen mensual calculado a partir de Income + Expense (+ tipo de cambio estimado). */
export interface MonthlySummary {
  mes: number
  anio: number
  /** Ingresos totales del mes en ARS, incluyendo el sueldo USD convertido a `tipoCambioUsado`. */
  ingresosTotalesARS: number
  /** Gastos totales del mes en ARS (montos en USD convertidos a `tipoCambioUsado`). */
  gastosTotales: number
  /** Ingresos - Gastos. */
  remanenteAhorro: number
  /** Gastos Totales / Ingresos Totales. */
  porcentajeFijo: number
  /** Tipo de cambio ARS/USD estimado usado para las conversiones de este resumen. */
  tipoCambioUsado: number
}

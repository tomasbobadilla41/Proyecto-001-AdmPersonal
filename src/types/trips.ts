import type { Currency, Money } from './money'

/**
 * Categorías de gasto de un viaje. Fuente única para el frontend; el CHECK
 * constraint de `trip_expenses.category` (migración 017) tiene que quedar
 * sincronizado a mano con esta lista.
 */
export const TRIP_EXPENSE_CATEGORIES = [
  'Vuelo',
  'Hospedaje',
  'Alquiler de auto',
  'Comida',
  'Excursiones',
  'Transporte',
  'Otros',
] as const

export type TripExpenseCategory = (typeof TRIP_EXPENSE_CATEGORIES)[number]

/** PAGADO: ya salió la plata. PENDIENTE: reservado/a pagar (ej: saldo del hotel en destino). */
export type TripExpenseStatus = 'PAGADO' | 'PENDIENTE'

/**
 * Quién puso la plata. El reparto entre la pareja es siempre 50/50, así que:
 *   - YO: pagué todo, mi pareja me debe la mitad.
 *   - PAREJA: pagó todo mi pareja, le debo la mitad.
 *   - COMPARTIDO: pagamos mitad cada uno, no queda saldo.
 */
export type TripPaidBy = 'YO' | 'PAREJA' | 'COMPARTIDO'

export interface Trip {
  id: string
  /** Nombre corto (ej: "Salta 2026"). */
  name: string
  destination: string
  /** 'YYYY-MM-DD' (fecha calendario, sin hora). */
  startDate: string
  /** 'YYYY-MM-DD'; nunca anterior a `startDate`. */
  endDate: string
  /** Presupuesto total del viaje (para los dos), opcional. */
  budget?: Money
  /** Cómo se muestra a la pareja en la UI (ej: "Sofi"). Si falta, "Pareja". */
  partnerName?: string
}

export interface TripExpense {
  id: string
  tripId: string
  category: TripExpenseCategory
  description: string
  amount: number
  currency: Currency
  /** 'YYYY-MM-DD': cuándo se pagó (o cuándo vence, si está PENDIENTE). */
  paymentDate: string
  status: TripExpenseStatus
  paidBy: TripPaidBy
  /** 1 = pago único. Si es > 1, la parte propia se reparte en cuotas mensuales en Gastos. */
  installments: number
  notes?: string
}

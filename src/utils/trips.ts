import {
  BedDouble,
  Bus,
  Car,
  Mountain,
  Package,
  Plane,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import type { Expense } from '../types/finance'
import type { Currency } from '../types/money'
import type { Trip, TripExpense, TripExpenseCategory, TripPaidBy } from '../types/trips'
import { addMonthsUTC, MESES_CORTOS, todayISODate, toARS } from './finance'

export const TRIP_CATEGORY_STYLE: Record<TripExpenseCategory, { icon: LucideIcon; chartColor: string }> = {
  Vuelo: { icon: Plane, chartColor: '#60a5fa' },
  Hospedaje: { icon: BedDouble, chartColor: '#a78bfa' },
  'Alquiler de auto': { icon: Car, chartColor: '#fbbf24' },
  Comida: { icon: UtensilsCrossed, chartColor: '#f87171' },
  Excursiones: { icon: Mountain, chartColor: '#34d399' },
  Transporte: { icon: Bus, chartColor: '#22d3ee' },
  Otros: { icon: Package, chartColor: '#a1a1aa' },
}

/** Nombre que se muestra para la pareja en un viaje. */
export function partnerLabel(trip: Trip): string {
  return trip.partnerName?.trim() || 'Pareja'
}

export function paidByLabel(paidBy: TripPaidBy, trip: Trip): string {
  if (paidBy === 'YO') return 'Yo'
  if (paidBy === 'PAREJA') return partnerLabel(trip)
  return 'Mitad cada uno'
}

/**
 * Lo que el usuario puso de su bolsillo en un gasto del viaje — es lo que
 * impacta en sus Gastos del mes (no su "parte" teórica del 50%: si pagó
 * todo, la tarjeta/cuenta muestra el total; la mitad que le devuelva la
 * pareja es un saldo aparte).
 */
export function ownOutOfPocket(expense: Pick<TripExpense, 'amount' | 'paidBy'>): number {
  if (expense.paidBy === 'YO') return expense.amount
  if (expense.paidBy === 'COMPARTIDO') return expense.amount / 2
  return 0
}

/**
 * Cuánto le debe la pareja al usuario por este gasto (negativo = el usuario
 * le debe a la pareja). Reparto 50/50; solo cuentan los gastos PAGADOS.
 */
function partnerDebt(expense: TripExpense): number {
  if (expense.status !== 'PAGADO') return 0
  if (expense.paidBy === 'YO') return expense.amount / 2
  if (expense.paidBy === 'PAREJA') return -expense.amount / 2
  return 0
}

/** Reparte `total` en `count` partes con centavos exactos (la última absorbe el redondeo). */
function splitInCents(total: number, count: number): number[] {
  const totalCents = Math.round(total * 100)
  const baseCents = Math.floor(totalCents / count)
  return Array.from({ length: count }, (_, i) =>
    (i === count - 1 ? totalCents - baseCents * (count - 1) : baseCents) / 100,
  )
}

/**
 * Los `Expense` (categoría FLEXIBLE 'Vacaciones') que un gasto del viaje
 * genera en Gastos: solo si está PAGADO y el usuario puso plata. Un pago en
 * cuotas sigue la misma convención que `ExpenseFormDrawer`: la Cuota 1 cae
 * el mes siguiente a la compra y cada registro se llama "... (Cuota i/N)".
 */
export function buildLinkedExpenses(tripExpense: TripExpense, trip: Trip): Expense[] {
  const outOfPocket = ownOutOfPocket(tripExpense)
  if (tripExpense.status !== 'PAGADO' || outOfPocket <= 0) return []

  const count = Math.max(1, tripExpense.installments)
  const baseDate = new Date(tripExpense.paymentDate)
  const amounts = splitInCents(outOfPocket, count)
  const baseDescription = `${tripExpense.category}: ${tripExpense.description}`

  return amounts.map((monto, index) => ({
    id: `trip-${tripExpense.id}-${index}`,
    fecha: count > 1 ? addMonthsUTC(baseDate, index + 1) : baseDate,
    descripcion: count > 1 ? `${baseDescription} (Cuota ${index + 1}/${count})` : baseDescription,
    monto,
    moneda: tripExpense.currency,
    expenseType: 'FLEXIBLE',
    category: 'Vacaciones',
    subcategoria: trip.name,
    tripExpenseId: tripExpense.id,
  }))
}

type CurrencyTotals = Record<Currency, number>

function emptyTotals(): CurrencyTotals {
  return { ARS: 0, USD: 0 }
}

export interface TripSummary {
  /** Total del viaje (para los dos), por moneda. */
  total: CurrencyTotals
  paid: CurrencyTotals
  pending: CurrencyTotals
  /** Total del viaje convertido a ARS con `tipoCambio`. */
  totalARS: number
  pendingARS: number
  /** Saldo con la pareja, por moneda: positivo = la pareja le debe al usuario. */
  partnerBalance: CurrencyTotals
}

export function summarizeTrip(expenses: TripExpense[], tipoCambio: number): TripSummary {
  const summary: TripSummary = {
    total: emptyTotals(),
    paid: emptyTotals(),
    pending: emptyTotals(),
    totalARS: 0,
    pendingARS: 0,
    partnerBalance: emptyTotals(),
  }

  for (const expense of expenses) {
    summary.total[expense.currency] += expense.amount
    if (expense.status === 'PAGADO') summary.paid[expense.currency] += expense.amount
    else summary.pending[expense.currency] += expense.amount
    summary.partnerBalance[expense.currency] += partnerDebt(expense)
  }

  summary.totalARS = toARS(summary.total.ARS, 'ARS', tipoCambio) + toARS(summary.total.USD, 'USD', tipoCambio)
  summary.pendingARS = summary.pending.ARS + toARS(summary.pending.USD, 'USD', tipoCambio)
  return summary
}

/** Total por categoría, en ARS, ordenado de mayor a menor (para el gráfico de torta). */
export function totalsByTripCategory(
  expenses: TripExpense[],
  tipoCambio: number,
): { category: TripExpenseCategory; total: number }[] {
  const totals = new Map<TripExpenseCategory, number>()
  for (const expense of expenses) {
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + toARS(expense.amount, expense.currency, tipoCambio))
  }
  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
}

/** Días calendario entre dos fechas 'YYYY-MM-DD' (b - a). */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
}

export type TripTiming =
  | { kind: 'upcoming'; daysLeft: number }
  | { kind: 'ongoing'; day: number; totalDays: number }
  | { kind: 'finished' }

export function getTripTiming(trip: Trip, today: string = todayISODate()): TripTiming {
  if (today < trip.startDate) return { kind: 'upcoming', daysLeft: daysBetween(today, trip.startDate) }
  if (today > trip.endDate) return { kind: 'finished' }
  return {
    kind: 'ongoing',
    day: daysBetween(trip.startDate, today) + 1,
    totalDays: daysBetween(trip.startDate, trip.endDate) + 1,
  }
}

export function formatTripTiming(timing: TripTiming): string {
  if (timing.kind === 'upcoming') {
    return timing.daysLeft === 1 ? 'Falta 1 día' : `Faltan ${timing.daysLeft} días`
  }
  if (timing.kind === 'ongoing') return `En curso · día ${timing.day} de ${timing.totalDays}`
  return 'Terminado'
}

/** "12 Dic – 19 Dic 2026" (o con los dos años si el viaje cruza de año). */
export function formatTripDates(trip: Trip): string {
  const format = (iso: string) => {
    const [, month, day] = iso.split('-').map(Number)
    return `${day} ${MESES_CORTOS[month - 1]}`
  }
  const startYear = trip.startDate.slice(0, 4)
  const endYear = trip.endDate.slice(0, 4)
  return startYear === endYear
    ? `${format(trip.startDate)} – ${format(trip.endDate)} ${endYear}`
    : `${format(trip.startDate)} ${startYear} – ${format(trip.endDate)} ${endYear}`
}

/** "12/12" a partir de 'YYYY-MM-DD'. */
export function formatShortDate(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${day}/${month}`
}

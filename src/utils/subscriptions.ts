import type { Expense } from '../types/finance'
import type { Currency } from '../types/money'

/** Mismo literal que usa `ExpenseFormDrawer` para la categoría de streaming. */
export const STREAMING_CATEGORY = 'Streaming (Netflix, YT)' as const

/**
 * Meses calendario sin cargos a partir de los cuales una suscripción se
 * considera dada de baja: con 2, en noviembre siguen activas las que se
 * cargaron en septiembre u octubre; una de agosto ya no.
 */
export const INACTIVE_AFTER_MONTHS = 2

export interface SubscriptionSummaryItem {
  title: string
  /** Monto del último cargo. Las importadas del CSV son en ARS, pero una cargada a mano puede ser en USD. */
  monto: number
  moneda: Currency
  /** Fecha del último cargo. */
  fecha: Date
  /** Tiene un cargo en el mes calendario actual. */
  loadedThisMonth: boolean
}

export interface ClassifiedSubscriptions {
  /** Con cargos recientes — son las que suman al total mensual. */
  active: SubscriptionSummaryItem[]
  /** Sin cargos hace más de `INACTIVE_AFTER_MONTHS` meses (probablemente dadas de baja). */
  inactive: SubscriptionSummaryItem[]
}

/** Índice absoluto de mes (año * 12 + mes) en UTC, como el resto de las fechas de gastos. */
function monthIndexUTC(date: Date): number {
  return date.getUTCFullYear() * 12 + date.getUTCMonth()
}

/**
 * Agrupa los gastos de streaming por suscripción (subcategoría) tomando el
 * último cargo de cada una, y las separa en activas / inactivas según la
 * antigüedad de ese cargo. Solo lee los gastos: no modifica nada.
 */
export function classifySubscriptions(expenses: Expense[], today: Date = new Date()): ClassifiedSubscriptions {
  const latestByTitle = new Map<string, Expense>()
  for (const expense of expenses) {
    if (expense.category !== STREAMING_CATEGORY || !expense.subcategoria) continue
    const current = latestByTitle.get(expense.subcategoria)
    if (!current || expense.fecha > current.fecha) {
      latestByTitle.set(expense.subcategoria, expense)
    }
  }

  // `today` usa el mes local (lo que el usuario considera "este mes"),
  // igual que el resto de la app al comparar contra fechas UTC de gastos.
  const currentMonth = today.getFullYear() * 12 + today.getMonth()
  const active: SubscriptionSummaryItem[] = []
  const inactive: SubscriptionSummaryItem[] = []

  for (const expense of latestByTitle.values()) {
    const monthsAgo = currentMonth - monthIndexUTC(expense.fecha)
    const item: SubscriptionSummaryItem = {
      title: expense.subcategoria!,
      monto: expense.monto,
      moneda: expense.moneda,
      fecha: expense.fecha,
      loadedThisMonth: monthsAgo <= 0,
    }
    if (monthsAgo > INACTIVE_AFTER_MONTHS) inactive.push(item)
    else active.push(item)
  }

  active.sort((a, b) => b.monto - a.monto)
  inactive.sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
  return { active, inactive }
}

import type {
  PropertyExpense,
  PropertyExpenseStatus,
  PropertyIncome,
  PropertyServiceConfig,
} from '../types/realEstate'
import { toARS } from './finance'

/**
 * Relaciona un `PropertyExpense` con su `PropertyServiceConfig` por
 * `serviceConfigId` (FK estable: renombrar el servicio no rompe el link).
 *
 * Defensivo: un gasto guardado antes de que existiera `serviceConfigId` (dato
 * viejo en `localStorage`) no lo tiene — en ese caso cae a comparar por
 * `serviceName`, como funcionaba antes, para no perder el enganche con datos
 * ya guardados.
 */
export function matchesServiceConfig(expense: PropertyExpense, service: PropertyServiceConfig): boolean {
  return expense.serviceConfigId
    ? expense.serviceConfigId === service.id
    : expense.serviceName === service.serviceName
}

/**
 * Suma los ingresos por alquiler de un período, convertidos a ARS.
 * Sin `propertyId`, suma todas las propiedades (para las métricas agregadas).
 */
export function sumPropertyIncomes(
  incomes: PropertyIncome[],
  month: number,
  year: number,
  tipoCambio: number,
  propertyId?: string,
): number {
  return incomes
    .filter(
      (income) =>
        income.month === month &&
        income.year === year &&
        (propertyId === undefined || income.propertyId === propertyId),
    )
    .reduce((total, income) => total + toARS(income.amount, income.currency, tipoCambio), 0)
}

interface SumPropertyExpensesOptions {
  propertyId?: string
  /** Si se pasa, solo suma gastos con alguno de estos estados (ej: solo los pagados). */
  statuses?: PropertyExpenseStatus[]
}

/**
 * Suma los gastos de propiedades de un período (en ARS, no hay conversión
 * porque `PropertyExpense` no tiene moneda). Sin `propertyId`, suma todas
 * las propiedades; sin `statuses`, suma sin importar el estado.
 */
export function sumPropertyExpenses(
  expenses: PropertyExpense[],
  month: number,
  year: number,
  options: SumPropertyExpensesOptions = {},
): number {
  const { propertyId, statuses } = options

  return expenses
    .filter(
      (expense) =>
        expense.month === month &&
        expense.year === year &&
        (propertyId === undefined || expense.propertyId === propertyId) &&
        (!statuses || statuses.includes(expense.status)),
    )
    .reduce((total, expense) => total + expense.amount, 0)
}

/** Años con al menos un registro (gasto o ingreso) de propiedades, más el año actual, desc. */
export function getAvailableRealEstateYears(expenses: PropertyExpense[], incomes: PropertyIncome[]): number[] {
  const years = new Set<number>()
  for (const expense of expenses) years.add(expense.year)
  for (const income of incomes) years.add(income.year)
  years.add(new Date().getFullYear())
  return Array.from(years).sort((a, b) => b - a)
}

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import type { ExchangeRate, Expense, Income, InvestmentPosition } from '../types/finance'
import { useLocalStorage } from './useLocalStorage'

const STORAGE_KEYS = {
  expenses: 'admpersonal:expenses',
  incomes: 'admpersonal:incomes',
  investments: 'admpersonal:investments',
  exchangeRates: 'admpersonal:exchangeRates',
  customStreamingServices: 'admpersonal:customStreamingServices',
} as const

/** `Expense.fecha` es un `Date`: hay que pasarlo por string para guardarlo en localStorage. */
function serializeExpenses(expenses: Expense[]): string {
  return JSON.stringify(expenses.map((e) => ({ ...e, fecha: e.fecha.toISOString() })))
}

function deserializeExpenses(raw: string): Expense[] {
  const parsed = JSON.parse(raw) as Array<Omit<Expense, 'fecha'> & { fecha: string }>
  return parsed.map((e) => ({ ...e, fecha: new Date(e.fecha) }))
}

/** Reemplaza el elemento con ese `id`, o lo deja igual si no lo encuentra. */
function replaceById<T extends { id: string }>(items: T[], updated: T): T[] {
  return items.map((item) => (item.id === updated.id ? updated : item))
}

/** Crea o reemplaza el registro de ese mes/año (un único registro por período). */
function upsertByPeriod<T extends { mes: number; anio: number }>(items: T[], updated: T): T[] {
  const index = items.findIndex((item) => item.mes === updated.mes && item.anio === updated.anio)
  if (index === -1) return [...items, updated]
  const next = [...items]
  next[index] = updated
  return next
}

interface FinanceStore {
  expenses: Expense[]
  incomes: Income[]
  investments: InvestmentPosition[]
  exchangeRates: ExchangeRate[]
  /** Agrega un gasto nuevo. */
  addExpense: (expense: Expense) => void
  /** Agrega varios gastos de una sola vez (ej: una carga recurrente de N meses) en un único update. */
  addExpenses: (expenses: Expense[]) => void
  /** Reemplaza un gasto existente (mismo `id`). */
  updateExpense: (expense: Expense) => void
  removeExpense: (id: string) => void
  /** Crea o reemplaza el Income de un mes/año (un registro por período). */
  upsertIncome: (income: Income) => void
  /** Agrega una posición de inversión nueva. */
  addInvestment: (position: InvestmentPosition) => void
  /** Reemplaza una posición existente (mismo `id`) — por ej. para actualizar su precio actual. */
  updateInvestment: (position: InvestmentPosition) => void
  removeInvestment: (id: string) => void
  /** Crea o reemplaza la cotización del dólar de un mes/año. */
  upsertExchangeRate: (rate: ExchangeRate) => void
  /** Servicios de streaming que el usuario agregó a mano (además de los precargados). */
  customStreamingServices: string[]
  addStreamingService: (name: string) => void
}

const FinanceStoreContext = createContext<FinanceStore | null>(null)

/**
 * Fuente única de verdad para gastos, ingresos, inversiones y cotizaciones,
 * persistida en `localStorage`. Se instancia una sola vez en la raíz de la
 * app (`App.tsx`) para que cualquier cambio (cargar/editar/borrar un gasto,
 * actualizar el precio de una inversión, setear la cotización del mes) se
 * refleje al instante en todo lo que consume `useFinanceStore` — sin
 * recargar la página — apenas React vuelve a renderizar.
 *
 * Si `localStorage` está vacío (primera vez que se abre la app), cada lista
 * arranca vacía: no se siembra con datos de ejemplo.
 */
export function FinanceStoreProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useLocalStorage<Expense[]>(STORAGE_KEYS.expenses, [], {
    serialize: serializeExpenses,
    deserialize: deserializeExpenses,
  })
  const [incomes, setIncomes] = useLocalStorage<Income[]>(STORAGE_KEYS.incomes, [])
  const [investments, setInvestments] = useLocalStorage<InvestmentPosition[]>(STORAGE_KEYS.investments, [])
  const [exchangeRates, setExchangeRates] = useLocalStorage<ExchangeRate[]>(STORAGE_KEYS.exchangeRates, [])
  const [customStreamingServices, setCustomStreamingServices] = useLocalStorage<string[]>(
    STORAGE_KEYS.customStreamingServices,
    [],
  )

  const addExpense = useCallback(
    (expense: Expense) => setExpenses((prev) => [...prev, expense]),
    [setExpenses],
  )
  const addExpenses = useCallback(
    (newExpenses: Expense[]) => setExpenses((prev) => [...prev, ...newExpenses]),
    [setExpenses],
  )
  const updateExpense = useCallback(
    (expense: Expense) => setExpenses((prev) => replaceById(prev, expense)),
    [setExpenses],
  )
  const removeExpense = useCallback(
    (id: string) => setExpenses((prev) => prev.filter((e) => e.id !== id)),
    [setExpenses],
  )

  const upsertIncome = useCallback(
    (income: Income) => setIncomes((prev) => upsertByPeriod(prev, income)),
    [setIncomes],
  )

  const addInvestment = useCallback(
    (position: InvestmentPosition) => setInvestments((prev) => [...prev, position]),
    [setInvestments],
  )
  const updateInvestment = useCallback(
    (position: InvestmentPosition) => setInvestments((prev) => replaceById(prev, position)),
    [setInvestments],
  )
  const removeInvestment = useCallback(
    (id: string) => setInvestments((prev) => prev.filter((p) => p.id !== id)),
    [setInvestments],
  )

  const upsertExchangeRate = useCallback(
    (rate: ExchangeRate) => setExchangeRates((prev) => upsertByPeriod(prev, rate)),
    [setExchangeRates],
  )

  const addStreamingService = useCallback(
    (name: string) =>
      setCustomStreamingServices((prev) => (prev.includes(name) ? prev : [...prev, name])),
    [setCustomStreamingServices],
  )

  const value = useMemo<FinanceStore>(
    () => ({
      expenses,
      incomes,
      investments,
      exchangeRates,
      addExpense,
      addExpenses,
      updateExpense,
      removeExpense,
      upsertIncome,
      addInvestment,
      updateInvestment,
      removeInvestment,
      upsertExchangeRate,
      customStreamingServices,
      addStreamingService,
    }),
    [
      expenses,
      incomes,
      investments,
      exchangeRates,
      addExpense,
      addExpenses,
      updateExpense,
      removeExpense,
      upsertIncome,
      addInvestment,
      updateInvestment,
      removeInvestment,
      upsertExchangeRate,
      customStreamingServices,
      addStreamingService,
    ],
  )

  return <FinanceStoreContext.Provider value={value}>{children}</FinanceStoreContext.Provider>
}

export function useFinanceStore(): FinanceStore {
  const context = useContext(FinanceStoreContext)
  if (!context) {
    throw new Error('useFinanceStore debe usarse dentro de un <FinanceStoreProvider>')
  }
  return context
}

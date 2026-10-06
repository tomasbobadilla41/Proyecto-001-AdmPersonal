import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import type { ExchangeRate, Income } from '../types/finance'
import { useLocalStorage } from './useLocalStorage'

const STORAGE_KEYS = {
  incomes: 'admpersonal:incomes',
  exchangeRates: 'admpersonal:exchangeRates',
  customStreamingServices: 'admpersonal:customStreamingServices',
} as const

/** Crea o reemplaza el registro de ese mes/año (un único registro por período). */
function upsertByPeriod<T extends { mes: number; anio: number }>(items: T[], updated: T): T[] {
  const index = items.findIndex((item) => item.mes === updated.mes && item.anio === updated.anio)
  if (index === -1) return [...items, updated]
  const next = [...items]
  next[index] = updated
  return next
}

interface FinanceStore {
  incomes: Income[]
  exchangeRates: ExchangeRate[]
  /** Crea o reemplaza el Income de un mes/año (un registro por período). */
  upsertIncome: (income: Income) => void
  /** Crea o reemplaza la cotización del dólar de un mes/año. */
  upsertExchangeRate: (rate: ExchangeRate) => void
  /** Servicios de streaming que el usuario agregó a mano (además de los precargados). */
  customStreamingServices: string[]
  addStreamingService: (name: string) => void
}

const FinanceStoreContext = createContext<FinanceStore | null>(null)

/**
 * Ingresos y cotizaciones, persistidos en `localStorage`. Los gastos viven en
 * `useExpenseStore` (Supabase, no localStorage) — ver ese hook.
 */
export function FinanceStoreProvider({ children }: { children: ReactNode }) {
  const [incomes, setIncomes] = useLocalStorage<Income[]>(STORAGE_KEYS.incomes, [])
  const [exchangeRates, setExchangeRates] = useLocalStorage<ExchangeRate[]>(STORAGE_KEYS.exchangeRates, [])
  const [customStreamingServices, setCustomStreamingServices] = useLocalStorage<string[]>(
    STORAGE_KEYS.customStreamingServices,
    [],
  )

  const upsertIncome = useCallback(
    (income: Income) => setIncomes((prev) => upsertByPeriod(prev, income)),
    [setIncomes],
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
      incomes,
      exchangeRates,
      upsertIncome,
      upsertExchangeRate,
      customStreamingServices,
      addStreamingService,
    }),
    [incomes, exchangeRates, upsertIncome, upsertExchangeRate, customStreamingServices, addStreamingService],
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

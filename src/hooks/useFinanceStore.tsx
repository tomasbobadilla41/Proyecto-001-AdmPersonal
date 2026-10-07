import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useLocalStorage } from './useLocalStorage'

const STORAGE_KEYS = {
  customStreamingServices: 'admpersonal:customStreamingServices',
} as const

interface FinanceStore {
  /** Servicios de streaming que el usuario agregó a mano (además de los precargados). */
  customStreamingServices: string[]
  addStreamingService: (name: string) => void
}

const FinanceStoreContext = createContext<FinanceStore | null>(null)

/**
 * Servicios de streaming personalizados, persistidos en `localStorage`.
 * Ingresos y cotizaciones viven en `useIncomeStore`/`useExchangeRateStore`,
 * y los gastos en `useExpenseStore` — todos en Supabase, no localStorage.
 */
export function FinanceStoreProvider({ children }: { children: ReactNode }) {
  const [customStreamingServices, setCustomStreamingServices] = useLocalStorage<string[]>(
    STORAGE_KEYS.customStreamingServices,
    [],
  )

  const addStreamingService = useCallback(
    (name: string) =>
      setCustomStreamingServices((prev) => (prev.includes(name) ? prev : [...prev, name])),
    [setCustomStreamingServices],
  )

  const value = useMemo<FinanceStore>(
    () => ({ customStreamingServices, addStreamingService }),
    [customStreamingServices, addStreamingService],
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

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import type { PortfolioHolding } from '../types/finance'
import { useLocalStorage } from './useLocalStorage'

const STORAGE_KEY = 'admpersonal:portfolioHoldings'

interface PortfolioStore {
  holdings: PortfolioHolding[]
  addHolding: (holding: PortfolioHolding) => void
  removeHolding: (id: string) => void
}

const PortfolioStoreContext = createContext<PortfolioStore | null>(null)

/**
 * Registros de compra del Portfolio Tracker (cripto + CEDEARs), persistidos
 * en `localStorage` — mock local mientras se migra a Supabase. Separado de
 * `useFinanceStore` porque el modelo de datos es otro (un registro por
 * compra, no una posición ya promediada).
 */
export function PortfolioStoreProvider({ children }: { children: ReactNode }) {
  const [holdings, setHoldings] = useLocalStorage<PortfolioHolding[]>(STORAGE_KEY, [])

  const addHolding = useCallback(
    (holding: PortfolioHolding) => setHoldings((prev) => [...prev, holding]),
    [setHoldings],
  )
  const removeHolding = useCallback(
    (id: string) => setHoldings((prev) => prev.filter((h) => h.id !== id)),
    [setHoldings],
  )

  const value = useMemo<PortfolioStore>(
    () => ({ holdings, addHolding, removeHolding }),
    [holdings, addHolding, removeHolding],
  )

  return <PortfolioStoreContext.Provider value={value}>{children}</PortfolioStoreContext.Provider>
}

export function usePortfolioStore(): PortfolioStore {
  const context = useContext(PortfolioStoreContext)
  if (!context) {
    throw new Error('usePortfolioStore debe usarse dentro de un <PortfolioStoreProvider>')
  }
  return context
}

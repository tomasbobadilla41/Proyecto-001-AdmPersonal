import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { PortfolioHolding } from '../types/finance'
import { useAuth } from './useAuth'
import { deleteHoldingRow, fetchHoldings, insertHolding } from '../services/portfolioApi'

interface PortfolioStore {
  holdings: PortfolioHolding[]
  isLoading: boolean
  /** Registra una compra. Devuelve `false` si falló (ya mostró su propio toast de error). */
  addHolding: (holding: PortfolioHolding) => Promise<boolean>
  removeHolding: (id: string) => Promise<boolean>
}

const PortfolioStoreContext = createContext<PortfolioStore | null>(null)

/**
 * Registros de compra del Portfolio Tracker (cripto + CEDEARs), persistidos
 * en Supabase (tabla `portfolio_holdings`, con RLS por `user_id`).
 */
export function PortfolioStoreProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id

  const [holdings, setHoldings] = useState<PortfolioHolding[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setHoldings([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    fetchHoldings(userId)
      .then((data) => {
        if (!cancelled) setHoldings(data)
      })
      .catch((error) => {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las inversiones.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  const addHolding = useCallback(
    async (holding: PortfolioHolding) => {
      if (!userId) return false
      try {
        const inserted = await insertHolding(holding, userId)
        setHoldings((prev) => [inserted, ...prev])
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo registrar la compra.')
        return false
      }
    },
    [userId],
  )

  const removeHolding = useCallback(async (id: string) => {
    try {
      await deleteHoldingRow(id)
      setHoldings((prev) => prev.filter((h) => h.id !== id))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el registro.')
      return false
    }
  }, [])

  const value = useMemo<PortfolioStore>(
    () => ({ holdings, isLoading, addHolding, removeHolding }),
    [holdings, isLoading, addHolding, removeHolding],
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

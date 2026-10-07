import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { ExchangeRate } from '../types/finance'
import { useAuth } from './useAuth'
import { fetchExchangeRates, upsertExchangeRateRow } from '../services/exchangeRatesApi'

/** Reemplaza el registro de ese mes/año, o lo agrega si no existía (un único registro por período). */
function replaceByPeriod(items: ExchangeRate[], updated: ExchangeRate): ExchangeRate[] {
  const index = items.findIndex((item) => item.mes === updated.mes && item.anio === updated.anio)
  if (index === -1) return [...items, updated]
  const next = [...items]
  next[index] = updated
  return next
}

interface ExchangeRateStore {
  exchangeRates: ExchangeRate[]
  isLoading: boolean
  /** Crea o reemplaza la cotización de un mes/año. Devuelve `false` si falló (ya mostró su propio toast). */
  upsertExchangeRate: (rate: ExchangeRate) => Promise<boolean>
}

const ExchangeRateStoreContext = createContext<ExchangeRateStore | null>(null)

/** Cotizaciones del dólar del usuario activo, persistidas en Supabase (tabla `exchange_rates`, con RLS por `user_id`). */
export function ExchangeRateStoreProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id

  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setExchangeRates([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    fetchExchangeRates(userId)
      .then((data) => {
        if (!cancelled) setExchangeRates(data)
      })
      .catch((error) => {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las cotizaciones.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  const upsertExchangeRate = useCallback(
    async (rate: ExchangeRate) => {
      if (!userId) return false
      try {
        const saved = await upsertExchangeRateRow(rate, userId)
        setExchangeRates((prev) => replaceByPeriod(prev, saved))
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar la cotización.')
        return false
      }
    },
    [userId],
  )

  const value = useMemo<ExchangeRateStore>(
    () => ({ exchangeRates, isLoading, upsertExchangeRate }),
    [exchangeRates, isLoading, upsertExchangeRate],
  )

  return <ExchangeRateStoreContext.Provider value={value}>{children}</ExchangeRateStoreContext.Provider>
}

export function useExchangeRateStore(): ExchangeRateStore {
  const context = useContext(ExchangeRateStoreContext)
  if (!context) {
    throw new Error('useExchangeRateStore debe usarse dentro de un <ExchangeRateStoreProvider>')
  }
  return context
}

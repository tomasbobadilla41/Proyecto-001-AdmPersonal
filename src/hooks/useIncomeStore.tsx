import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { Income } from '../types/finance'
import { useAuth } from './useAuth'
import { fetchIncomes, upsertIncomeRow } from '../services/incomesApi'

/** Reemplaza el registro de ese mes/año, o lo agrega si no existía (un único registro por período). */
function replaceByPeriod(items: Income[], updated: Income): Income[] {
  const index = items.findIndex((item) => item.mes === updated.mes && item.anio === updated.anio)
  if (index === -1) return [...items, updated]
  const next = [...items]
  next[index] = updated
  return next
}

interface IncomeStore {
  incomes: Income[]
  isLoading: boolean
  /** Crea o reemplaza el ingreso de un mes/año. Devuelve `false` si falló (ya mostró su propio toast). */
  upsertIncome: (income: Income) => Promise<boolean>
}

const IncomeStoreContext = createContext<IncomeStore | null>(null)

/** Ingresos (sueldo) del usuario activo, persistidos en Supabase (tabla `incomes`, con RLS por `user_id`). */
export function IncomeStoreProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id

  const [incomes, setIncomes] = useState<Income[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setIncomes([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    fetchIncomes(userId)
      .then((data) => {
        if (!cancelled) setIncomes(data)
      })
      .catch((error) => {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los ingresos.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  const upsertIncome = useCallback(
    async (income: Income) => {
      if (!userId) return false
      try {
        const saved = await upsertIncomeRow(income, userId)
        setIncomes((prev) => replaceByPeriod(prev, saved))
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar el sueldo.')
        return false
      }
    },
    [userId],
  )

  const value = useMemo<IncomeStore>(
    () => ({ incomes, isLoading, upsertIncome }),
    [incomes, isLoading, upsertIncome],
  )

  return <IncomeStoreContext.Provider value={value}>{children}</IncomeStoreContext.Provider>
}

export function useIncomeStore(): IncomeStore {
  const context = useContext(IncomeStoreContext)
  if (!context) {
    throw new Error('useIncomeStore debe usarse dentro de un <IncomeStoreProvider>')
  }
  return context
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { Expense } from '../types/finance'
import { useAuth } from './useAuth'
import { deleteExpenseRow, fetchExpenses, insertExpenses, updateExpenseRow } from '../services/expensesApi'

/** Reemplaza el elemento con ese `id`, o lo deja igual si no lo encuentra. */
function replaceById<T extends { id: string }>(items: T[], updated: T): T[] {
  return items.map((item) => (item.id === updated.id ? updated : item))
}

interface ExpenseStore {
  expenses: Expense[]
  /** `true` mientras se trae la carga inicial de gastos del usuario. */
  isLoading: boolean
  /**
   * Inserta uno o varios gastos (ej: una carga recurrente/en cuotas) en un
   * solo request. Devuelve `false` si falló (ya mostró su propio toast de
   * error) — útil para flujos que necesitan saber si de verdad se guardó
   * (ej: el resumen de la importación de CSV).
   */
  addExpenses: (expenses: Expense[]) => Promise<boolean>
  /** Reemplaza un gasto existente (mismo `id`). */
  updateExpense: (expense: Expense) => Promise<boolean>
  removeExpense: (id: string) => Promise<boolean>
}

const ExpenseStoreContext = createContext<ExpenseStore | null>(null)

/**
 * Gastos del usuario activo, persistidos en Supabase (tabla `expenses`, con
 * RLS por `user_id`) — ya no en `localStorage`. El estado local (`expenses`)
 * se mantiene sincronizado a mano después de cada operación exitosa, así la
 * UI se actualiza al instante sin recargar la página ni volver a pedirle
 * todo a Supabase.
 */
export function ExpenseStoreProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setExpenses([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    fetchExpenses(userId)
      .then((data) => {
        if (!cancelled) setExpenses(data)
      })
      .catch((error) => {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los gastos.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  const addExpenses = useCallback(
    async (newExpenses: Expense[]) => {
      if (!userId) return false
      try {
        const inserted = await insertExpenses(newExpenses, userId)
        setExpenses((prev) => [...inserted, ...prev])
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar el gasto.')
        return false
      }
    },
    [userId],
  )

  const updateExpense = useCallback(
    async (expense: Expense) => {
      if (!userId) return false
      try {
        const updated = await updateExpenseRow(expense, userId)
        setExpenses((prev) => replaceById(prev, updated))
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el gasto.')
        return false
      }
    },
    [userId],
  )

  const removeExpense = useCallback(async (id: string) => {
    try {
      await deleteExpenseRow(id)
      setExpenses((prev) => prev.filter((e) => e.id !== id))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el gasto.')
      return false
    }
  }, [])

  const value = useMemo<ExpenseStore>(
    () => ({ expenses, isLoading, addExpenses, updateExpense, removeExpense }),
    [expenses, isLoading, addExpenses, updateExpense, removeExpense],
  )

  return <ExpenseStoreContext.Provider value={value}>{children}</ExpenseStoreContext.Provider>
}

export function useExpenseStore(): ExpenseStore {
  const context = useContext(ExpenseStoreContext)
  if (!context) {
    throw new Error('useExpenseStore debe usarse dentro de un <ExpenseStoreProvider>')
  }
  return context
}

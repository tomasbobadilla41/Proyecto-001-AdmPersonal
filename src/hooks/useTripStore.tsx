import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { Trip, TripExpense } from '../types/trips'
import { useAuth } from './useAuth'
import { useExpenseStore } from './useExpenseStore'
import {
  deleteTripExpenseRow,
  deleteTripRow,
  fetchTripExpenses,
  fetchTrips,
  insertTrip,
  insertTripExpense,
  updateTripExpenseRow,
  updateTripRow,
} from '../services/tripsApi'
import { replaceById } from './storeHelpers'
import { buildLinkedExpenses } from '../utils/trips'

interface TripStore {
  trips: Trip[]
  tripExpenses: TripExpense[]
  /** `true` mientras se trae la carga inicial de viajes y sus gastos. */
  isLoading: boolean

  addTrip: (trip: Trip) => Promise<boolean>
  updateTrip: (trip: Trip) => Promise<boolean>
  /** Borra el viaje con todos sus gastos (y los gastos del mes que generaron). */
  removeTrip: (id: string) => Promise<boolean>

  addTripExpense: (expense: TripExpense) => Promise<boolean>
  updateTripExpense: (expense: TripExpense) => Promise<boolean>
  removeTripExpense: (id: string) => Promise<boolean>
}

const TripStoreContext = createContext<TripStore | null>(null)

/**
 * Solapa Vacaciones: viajes (`trips`) y sus gastos (`trip_expenses`) en
 * Supabase, con RLS por `user_id`. Cada alta/edición de un gasto del viaje
 * regenera además sus `expenses` vinculados (categoría 'Vacaciones') a
 * través de `useExpenseStore`, así Gastos y el 50/30/20 quedan al día sin
 * recargar — por eso este provider tiene que ir dentro de
 * `ExpenseStoreProvider`.
 */
export function TripStoreProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const { replaceTripLinkedExpenses, forgetTripLinkedExpenses } = useExpenseStore()

  const [trips, setTrips] = useState<Trip[]>([])
  const [tripExpenses, setTripExpenses] = useState<TripExpense[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setTrips([])
      setTripExpenses([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    Promise.all([fetchTrips(userId), fetchTripExpenses(userId)])
      .then(([tripsData, expensesData]) => {
        if (cancelled) return
        setTrips(tripsData)
        setTripExpenses(expensesData)
      })
      .catch((error) => {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los viajes.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  /** Regenera los gastos del mes de un gasto del viaje. Si falla, ya mostró su propio toast. */
  const syncLinked = useCallback(
    (expense: TripExpense, trip: Trip) => replaceTripLinkedExpenses(expense.id, buildLinkedExpenses(expense, trip)),
    [replaceTripLinkedExpenses],
  )

  const addTrip = useCallback(
    async (trip: Trip) => {
      if (!userId) return false
      try {
        const inserted = await insertTrip(trip, userId)
        setTrips((prev) => [inserted, ...prev])
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo crear el viaje.')
        return false
      }
    },
    [userId],
  )

  const updateTrip = useCallback(
    async (trip: Trip) => {
      if (!userId) return false
      const previous = trips.find((t) => t.id === trip.id)
      try {
        const updated = await updateTripRow(trip, userId)
        setTrips((prev) => replaceById(prev, updated))
        // El nombre del viaje va como subcategoría de los gastos del mes:
        // si cambió, se regeneran para no dejar el nombre viejo.
        if (previous && previous.name !== updated.name) {
          const ownExpenses = tripExpenses.filter((e) => e.tripId === updated.id)
          await Promise.all(ownExpenses.map((e) => syncLinked(e, updated)))
        }
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el viaje.')
        return false
      }
    },
    [userId, trips, tripExpenses, syncLinked],
  )

  const removeTrip = useCallback(
    async (id: string) => {
      try {
        await deleteTripRow(id)
        const removedExpenseIds = tripExpenses.filter((e) => e.tripId === id).map((e) => e.id)
        setTrips((prev) => prev.filter((t) => t.id !== id))
        setTripExpenses((prev) => prev.filter((e) => e.tripId !== id))
        // Postgres ya borró en cascada los gastos del mes vinculados.
        forgetTripLinkedExpenses(removedExpenseIds)
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el viaje.')
        return false
      }
    },
    [tripExpenses, forgetTripLinkedExpenses],
  )

  const addTripExpense = useCallback(
    async (expense: TripExpense) => {
      if (!userId) return false
      const trip = trips.find((t) => t.id === expense.tripId)
      if (!trip) return false
      try {
        const inserted = await insertTripExpense(expense, userId)
        setTripExpenses((prev) => [...prev, inserted])
        if (buildLinkedExpenses(inserted, trip).length > 0) await syncLinked(inserted, trip)
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar el gasto del viaje.')
        return false
      }
    },
    [userId, trips, syncLinked],
  )

  const updateTripExpense = useCallback(
    async (expense: TripExpense) => {
      if (!userId) return false
      const trip = trips.find((t) => t.id === expense.tripId)
      if (!trip) return false
      try {
        const updated = await updateTripExpenseRow(expense, userId)
        setTripExpenses((prev) => replaceById(prev, updated))
        await syncLinked(updated, trip)
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el gasto del viaje.')
        return false
      }
    },
    [userId, trips, syncLinked],
  )

  const removeTripExpense = useCallback(
    async (id: string) => {
      try {
        await deleteTripExpenseRow(id)
        setTripExpenses((prev) => prev.filter((e) => e.id !== id))
        forgetTripLinkedExpenses([id])
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el gasto del viaje.')
        return false
      }
    },
    [forgetTripLinkedExpenses],
  )

  const value = useMemo<TripStore>(
    () => ({
      trips,
      tripExpenses,
      isLoading,
      addTrip,
      updateTrip,
      removeTrip,
      addTripExpense,
      updateTripExpense,
      removeTripExpense,
    }),
    [trips, tripExpenses, isLoading, addTrip, updateTrip, removeTrip, addTripExpense, updateTripExpense, removeTripExpense],
  )

  return <TripStoreContext.Provider value={value}>{children}</TripStoreContext.Provider>
}

export function useTripStore(): TripStore {
  const context = useContext(TripStoreContext)
  if (!context) {
    throw new Error('useTripStore debe usarse dentro de un <TripStoreProvider>')
  }
  return context
}

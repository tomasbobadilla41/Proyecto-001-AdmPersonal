import { useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { FloatingActionButton } from '../components/common/FloatingActionButton'
import { Skeleton } from '../components/common/Skeleton'
import { TripFormDialog } from '../components/trips/TripFormDialog'
import { TripDetailView } from './TripDetailView'
import { useTripStore } from '../hooks/useTripStore'
import { useExchangeRateStore } from '../hooks/useExchangeRateStore'
import { formatMoney } from '../utils/currency'
import { getExchangeRate } from '../utils/finance'
import { formatTripDates, formatTripTiming, getTripTiming, summarizeTrip } from '../utils/trips'

/** Solapa Vacaciones: lista de viajes; al elegir uno, su detalle de gastos. */
export function TripsPage() {
  const { trips, tripExpenses, isLoading, addTrip } = useTripStore()
  const { exchangeRates } = useExchangeRateStore()

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const now = new Date()
  const tipoCambio = getExchangeRate(exchangeRates, now.getMonth() + 1, now.getFullYear())

  if (selectedTripId) {
    return <TripDetailView tripId={selectedTripId} onBack={() => setSelectedTripId(null)} />
  }

  // Próximos / en curso primero (el más cercano arriba), después los terminados (el más reciente arriba).
  const sortedTrips = [...trips].sort((a, b) => {
    const aDone = getTripTiming(a).kind === 'finished'
    const bDone = getTripTiming(b).kind === 'finished'
    if (aDone !== bDone) return aDone ? 1 : -1
    return aDone ? b.startDate.localeCompare(a.startDate) : a.startDate.localeCompare(b.startDate)
  })

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Vacaciones</h2>
        <p className="text-sm text-muted">Gastos de cada viaje, quién pagó qué y cuánto falta pagar.</p>
      </div>

      {isLoading ? (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel" aria-busy="true">
          {Array.from({ length: 2 }, (_, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-4 w-24" />
            </li>
          ))}
        </ul>
      ) : trips.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-panel px-5 py-10 text-center">
          <p className="text-sm text-faint">Todavía no cargaste ningún viaje.</p>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong"
          >
            Crear el primer viaje
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
          {sortedTrips.map((trip) => {
            const expenses = tripExpenses.filter((e) => e.tripId === trip.id)
            const summary = summarizeTrip(expenses, tipoCambio)
            const timing = getTripTiming(trip)

            return (
              <li key={trip.id}>
                <button
                  type="button"
                  onClick={() => setSelectedTripId(trip.id)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-line/30 focus-visible:bg-line/30 focus-visible:outline-none sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{trip.name}</p>
                    <p className="truncate text-xs text-faint">
                      {trip.destination} · {formatTripDates(trip)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium tabular-nums text-ink">
                      {formatMoney({ amount: summary.totalARS, currency: 'ARS' })}
                    </p>
                    <p
                      className={`text-xs ${timing.kind === 'finished' ? 'text-faint' : 'font-medium text-accent-text'}`}
                    >
                      {formatTripTiming(timing)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-faint" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <FloatingActionButton icon={Plus} label="Nuevo viaje" onClick={() => setIsCreating(true)} />
      <TripFormDialog
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        onSubmit={async (trip) => {
          if (await addTrip(trip)) setIsCreating(false)
        }}
      />
    </div>
  )
}

import { useMemo, useState } from 'react'
import { ArrowLeft, HandCoins, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Currency } from '../types/money'
import type { TripExpense } from '../types/trips'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { FloatingActionButton } from '../components/common/FloatingActionButton'
import { ProgressBar } from '../components/common/ProgressBar'
import { SummaryMetrics } from '../components/common/SummaryMetrics'
import { TripFormDialog } from '../components/trips/TripFormDialog'
import { TripExpenseFormDialog } from '../components/trips/TripExpenseFormDialog'
import { TripExpenseList } from '../components/trips/TripExpenseList'
import { TripCategoryChart } from '../components/trips/TripCategoryChart'
import { useTripStore } from '../hooks/useTripStore'
import { useExchangeRateStore } from '../hooks/useExchangeRateStore'
import { formatMoney } from '../utils/currency'
import { getExchangeRate, toARS } from '../utils/finance'
import {
  formatTripDates,
  formatTripTiming,
  getTripTiming,
  partnerLabel,
  summarizeTrip,
} from '../utils/trips'

interface TripDetailViewProps {
  tripId: string
  onBack: () => void
}

type ExpenseFormState = { mode: 'create' } | { mode: 'edit'; expense: TripExpense } | null
type DeleteTarget = { kind: 'trip' } | { kind: 'expense'; expense: TripExpense } | null

const CURRENCIES: Currency[] = ['ARS', 'USD']

export function TripDetailView({ tripId, onBack }: TripDetailViewProps) {
  const { trips, tripExpenses, isLoading, updateTrip, removeTrip, addTripExpense, updateTripExpense, removeTripExpense } =
    useTripStore()
  const { exchangeRates } = useExchangeRateStore()

  const [isEditingTrip, setIsEditingTrip] = useState(false)
  const [expenseFormState, setExpenseFormState] = useState<ExpenseFormState>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)

  const foundTrip = trips.find((t) => t.id === tripId)
  const expenses = useMemo(
    () =>
      tripExpenses
        .filter((e) => e.tripId === tripId)
        .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate) || a.description.localeCompare(b.description, 'es')),
    [tripExpenses, tripId],
  )

  // Cotización del mes actual para unificar ARS + USD (estimación, como en el resto de la app).
  const now = new Date()
  const tipoCambio = getExchangeRate(exchangeRates, now.getMonth() + 1, now.getFullYear())
  const summary = useMemo(() => summarizeTrip(expenses, tipoCambio), [expenses, tipoCambio])

  if (!foundTrip) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <BackButton onBack={onBack} />
        <p className="text-sm text-faint">No se encontró el viaje.</p>
      </div>
    )
  }

  const trip = foundTrip
  const timing = getTripTiming(trip)
  const partner = partnerLabel(trip)

  const budgetARS = trip.budget ? toARS(trip.budget.amount, trip.budget.currency, tipoCambio) : null
  const budgetUsedPct = budgetARS ? (summary.totalARS / budgetARS) * 100 : 0
  const budgetLeftARS = budgetARS !== null ? budgetARS - summary.totalARS : null

  const totalBreakdown = CURRENCIES.filter((c) => summary.total[c] > 0)
    .map((c) => formatMoney({ amount: summary.total[c], currency: c }))
    .join(' + ')

  async function handleSubmitExpense(expense: TripExpense) {
    const ok = expenseFormState?.mode === 'edit' ? await updateTripExpense(expense) : await addTripExpense(expense)
    if (ok) setExpenseFormState(null)
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'trip') {
      void removeTrip(trip.id)
      onBack()
    } else {
      void removeTripExpense(deleteTarget.expense.id)
    }
    setDeleteTarget(null)
  }

  const deleteDialog =
    deleteTarget?.kind === 'trip'
      ? {
          title: `¿Eliminar "${trip.name}"?`,
          description:
            expenses.length > 0
              ? `También se borrarán sus ${expenses.length} gasto(s) y las cuotas que generaron en Gastos. No se puede deshacer.`
              : 'No se puede deshacer.',
        }
      : deleteTarget?.kind === 'expense'
        ? {
            title: `¿Eliminar "${deleteTarget.expense.description}"?`,
            description: 'También se borra lo que había generado en Gastos. No se puede deshacer.',
          }
        : { title: '', description: '' }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex items-start gap-3">
        <BackButton onBack={onBack} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-2xl font-semibold tracking-tight text-ink">{trip.name}</h2>
          <p className="truncate text-sm text-muted">
            {trip.destination} · {formatTripDates(trip)} ·{' '}
            <span className={timing.kind === 'finished' ? '' : 'font-medium text-accent-text'}>
              {formatTripTiming(timing)}
            </span>
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Acciones del viaje"
            className="rounded-lg p-2 text-faint outline-none transition-colors hover:bg-line hover:text-ink-soft focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <MoreHorizontal className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setIsEditingTrip(true)}>
              <Pencil className="h-4 w-4" />
              Editar viaje
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget({ kind: 'trip' })}>
              <Trash2 className="h-4 w-4" />
              Eliminar viaje
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SummaryMetrics
        metrics={[
          {
            label: 'Total del viaje',
            value: formatMoney({ amount: summary.totalARS, currency: 'ARS' }),
            caption: summary.total.USD > 0 ? `${totalBreakdown} · USD a $${tipoCambio}` : 'para los dos',
          },
          {
            label: 'Mi parte (50%)',
            value: formatMoney({ amount: summary.totalARS / 2, currency: 'ARS' }),
          },
          {
            label: 'Falta pagar',
            value: formatMoney({ amount: summary.pendingARS, currency: 'ARS' }),
            valueClassName: summary.pendingARS > 0 ? 'text-warning' : 'text-ink',
          },
        ]}
      />

      {trip.budget && budgetLeftARS !== null && (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted">
              Presupuesto: {formatMoney(trip.budget)}
            </span>
            <span className={`font-medium tabular-nums ${budgetLeftARS < 0 ? 'text-negative' : 'text-ink'}`}>
              {budgetLeftARS < 0
                ? `Te pasaste ${formatMoney({ amount: -budgetLeftARS, currency: 'ARS' })}`
                : `Quedan ${formatMoney({ amount: budgetLeftARS, currency: 'ARS' })}`}
            </span>
          </div>
          <ProgressBar value={budgetUsedPct} indicatorClassName={budgetUsedPct > 100 ? 'bg-negative' : 'bg-accent'} />
        </div>
      )}

      <PartnerBalanceCard balance={summary.partnerBalance} partner={partner} />

      <TripCategoryChart expenses={expenses} tipoCambio={tipoCambio} />

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted">Gastos</h3>
        <TripExpenseList
          trip={trip}
          expenses={expenses}
          isLoading={isLoading}
          onEdit={(expense) => setExpenseFormState({ mode: 'edit', expense })}
          onDelete={(expense) => setDeleteTarget({ kind: 'expense', expense })}
        />
      </div>

      <FloatingActionButton icon={Plus} label="Cargar gasto" onClick={() => setExpenseFormState({ mode: 'create' })} />

      <TripFormDialog
        isOpen={isEditingTrip}
        onClose={() => setIsEditingTrip(false)}
        onSubmit={async (updated) => {
          if (await updateTrip(updated)) setIsEditingTrip(false)
        }}
        initialTrip={trip}
      />
      <TripExpenseFormDialog
        isOpen={expenseFormState !== null}
        trip={trip}
        onClose={() => setExpenseFormState(null)}
        onSubmit={handleSubmitExpense}
        initialExpense={expenseFormState?.mode === 'edit' ? expenseFormState.expense : undefined}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteDialog.title}
        description={deleteDialog.description}
        confirmLabel="Eliminar"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

/** Saldo entre la pareja por moneda (no se mezclan ARS y USD: cada deuda se salda en su moneda). */
function PartnerBalanceCard({ balance, partner }: { balance: Record<Currency, number>; partner: string }) {
  const lines = CURRENCIES.filter((c) => Math.abs(balance[c]) >= 0.01).map((c) => {
    const amount = formatMoney({ amount: Math.abs(balance[c]), currency: c })
    return balance[c] > 0 ? `${partner} te debe ${amount}` : `Le debés ${amount} a ${partner}`
  })

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-panel px-5 py-4">
      <HandCoins className="h-5 w-5 shrink-0 text-muted" />
      <div className="min-w-0 text-sm">
        {lines.length === 0 ? (
          <p className="text-ink-soft">Están a mano con {partner}.</p>
        ) : (
          lines.map((line) => (
            <p key={line} className="font-medium text-ink">
              {line}
            </p>
          ))
        )}
        <p className="text-xs text-faint">Reparto 50/50 de los gastos ya pagados.</p>
      </div>
    </div>
  )
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      aria-label="Volver a Vacaciones"
      className="mt-0.5 rounded-lg border border-line p-2 text-muted transition-colors hover:bg-line hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  )
}

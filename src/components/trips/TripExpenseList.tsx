import { Pencil, Trash2 } from 'lucide-react'
import type { Trip, TripExpense } from '../../types/trips'
import { formatMoney } from '../../utils/currency'
import { formatShortDate, paidByLabel, TRIP_CATEGORY_STYLE } from '../../utils/trips'
import { Skeleton } from '../common/Skeleton'

interface TripExpenseListProps {
  trip: Trip
  expenses: TripExpense[]
  isLoading: boolean
  onEdit: (expense: TripExpense) => void
  onDelete: (expense: TripExpense) => void
}

/** Gastos del viaje ordenados por fecha. Tocar la fila edita; el tacho borra. */
export function TripExpenseList({ trip, expenses, isLoading, onEdit, onDelete }: TripExpenseListProps) {
  if (isLoading) {
    return (
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel" aria-busy="true">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-20" />
          </li>
        ))}
      </ul>
    )
  }

  if (expenses.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-panel px-5 py-10 text-center text-sm text-faint">
        Todavía no cargaste gastos para este viaje. Empezá por el vuelo y el hospedaje.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
      {expenses.map((expense) => {
        const { icon: Icon, chartColor } = TRIP_CATEGORY_STYLE[expense.category]
        const isPending = expense.status === 'PENDIENTE'

        return (
          <li key={expense.id} className="group flex items-center">
            <button
              type="button"
              onClick={() => onEdit(expense)}
              aria-label={`Editar ${expense.description}`}
              className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left transition-colors hover:bg-line/30 active:bg-line/40 sm:pl-5"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${chartColor}26`, color: chartColor }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink" title={expense.description}>
                  {expense.description}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-faint">
                  <span className="tabular-nums">{formatShortDate(expense.paymentDate)}</span>
                  <span>{expense.category}</span>
                  <span>Pagó: {paidByLabel(expense.paidBy, trip)}</span>
                  {expense.installments > 1 && <span>{expense.installments} cuotas</span>}
                  {isPending && (
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 font-medium text-warning">
                      A pagar
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`shrink-0 pr-1 text-sm font-medium tabular-nums ${isPending ? 'text-muted' : 'text-ink'}`}
              >
                {formatMoney({ amount: expense.amount, currency: expense.currency })}
              </span>
            </button>
            <div className="flex gap-1 px-2">
              <button
                type="button"
                onClick={() => onEdit(expense)}
                aria-label="Editar gasto"
                title="Editar gasto"
                className="hidden rounded-lg p-1.5 text-faint opacity-0 transition-opacity hover:bg-line hover:text-ink-soft focus-visible:opacity-100 group-hover:opacity-100 md:block"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(expense)}
                aria-label="Eliminar gasto"
                title="Eliminar gasto"
                className="rounded-lg p-1.5 text-faint transition-colors hover:bg-negative/10 hover:text-negative"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

import type { ReactNode } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { Expense, ExpenseType } from '../../types/finance'
import { formatMoney } from '../../utils/currency'
import { formatDateAR } from '../../utils/finance'
import { CategoryBadge } from './CategoryBadge'
import { Skeleton } from '../common/Skeleton'
import { TableSkeletonRows } from '../common/TableSkeletonRows'

interface ExpenseListProps {
  expenses: Expense[]
  isLoading: boolean
  emptyMessage: string
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}

const TYPE_LABEL: Record<ExpenseType, { label: string; className: string }> = {
  FIJO: { label: 'Fijo', className: 'text-fijos' },
  FLEXIBLE: { label: 'Flexible', className: 'text-flexibles' },
}

/**
 * Lista de gastos del mes. En desktop es una tabla de 4 columnas (la
 * categoría y el tipo van debajo de la descripción, en vez de dos columnas
 * de badges); en mobile, filas compactas donde tocar el gasto lo edita —
 * sin scroll horizontal y con la descripción siempre visible.
 */
export function ExpenseList({ expenses, isLoading, emptyMessage, onEdit, onDelete }: ExpenseListProps) {
  const isEmpty = !isLoading && expenses.length === 0

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      {/* Desktop */}
      <table className="hidden w-full text-left text-sm md:table">
        <thead className="border-b border-line text-xs text-muted">
          <tr>
            <th className="w-32 px-5 py-3 font-medium">Fecha</th>
            <th className="px-5 py-3 font-medium">Descripción</th>
            <th className="px-5 py-3 text-right font-medium">Monto</th>
            <th className="w-24 px-5 py-3">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {isLoading && <TableSkeletonRows columns={4} rows={5} />}
          {!isLoading &&
            expenses.map((expense) => (
              <tr key={expense.id} className="group transition-colors hover:bg-line/30">
                <td className="whitespace-nowrap px-5 py-3 align-top text-muted tabular-nums">
                  {formatDateAR(expense.fecha)}
                </td>
                <td className="max-w-0 px-5 py-3">
                  <p className="truncate text-ink" title={expense.descripcion}>
                    {expense.descripcion}
                  </p>
                  <ExpenseMeta expense={expense} />
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right align-top font-medium tabular-nums text-ink">
                  {formatMoney({ amount: expense.monto, currency: expense.moneda })}
                </td>
                <td className="px-5 py-3 align-top">
                  {/* Visibles al pasar el mouse o al llegar con Tab (focus-within). */}
                  <div className="flex justify-end gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    <IconButton label="Editar gasto" onClick={() => onEdit(expense)}>
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Eliminar gasto" onClick={() => onDelete(expense)} destructive>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      {/* Mobile */}
      <ul className="divide-y divide-line md:hidden">
        {isLoading &&
          Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
              <Skeleton className="h-4 w-20" />
            </li>
          ))}
        {!isLoading &&
          expenses.map((expense) => (
            <li key={expense.id} className="flex items-center">
              <button
                type="button"
                onClick={() => onEdit(expense)}
                aria-label={`Editar ${expense.descripcion}`}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 py-3 pl-4 text-left active:bg-line/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{expense.descripcion}</p>
                  <ExpenseMeta expense={expense} showDate />
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums text-ink">
                  {formatMoney({ amount: expense.monto, currency: expense.moneda })}
                </span>
              </button>
              <div className="px-2">
                <IconButton label="Eliminar gasto" onClick={() => onDelete(expense)} destructive>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </li>
          ))}
      </ul>

      {isEmpty && <p className="px-5 py-10 text-center text-sm text-faint">{emptyMessage}</p>}
    </div>
  )
}

/** Línea secundaria: categoría · subcategoría · tipo (y fecha en mobile, donde no hay columna). */
function ExpenseMeta({ expense, showDate = false }: { expense: Expense; showDate?: boolean }) {
  const type = TYPE_LABEL[expense.expenseType]

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-faint">
      <CategoryBadge category={expense.category} />
      {expense.subcategoria && <span>{expense.subcategoria}</span>}
      <span className={type.className}>{type.label}</span>
      {showDate && <span className="tabular-nums">{formatDateAR(expense.fecha).slice(0, 5)}</span>}
    </div>
  )
}

interface IconButtonProps {
  label: string
  onClick: () => void
  destructive?: boolean
  children: ReactNode
}

function IconButton({ label, onClick, destructive = false, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-lg p-1.5 text-faint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
        destructive ? 'hover:bg-negative/10 hover:text-negative' : 'hover:bg-line hover:text-ink-soft'
      }`}
    >
      {children}
    </button>
  )
}

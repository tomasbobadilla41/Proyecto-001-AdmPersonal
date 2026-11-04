import { useState, type ReactNode } from 'react'
import { ChevronRight, Trash2 } from 'lucide-react'
import type { PortfolioHolding } from '../../types/finance'
import type { AggregatedPosition } from '../../utils/portfolio'
import { formatQuantity } from '../../utils/portfolio'
import { formatMoney } from '../../utils/currency'
import { formatDateAR } from '../../utils/finance'
import { Skeleton } from '../common/Skeleton'

interface PositionListProps {
  positions: AggregatedPosition[]
  isLoading: boolean
  emptyMessage: string
  /** Columna derecha de cada posición (ej: valor actual + rendimiento en cripto, total invertido en CEDEARs). */
  renderValue: (position: AggregatedPosition) => ReactNode
  onDeletePurchase: (purchase: PortfolioHolding) => void
}

/**
 * Posiciones agrupadas por ticker (cantidad total + precio promedio de
 * compra). Cada una se despliega para ver sus compras individuales, que se
 * borran de a una — así una compra cargada mal se corrige sin perder el
 * resto de la posición. Filas en vez de tabla: sin scroll lateral en mobile.
 */
export function PositionList({ positions, isLoading, emptyMessage, renderValue, onDeletePurchase }: PositionListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(ticker: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(ticker)) next.delete(ticker)
      else next.add(ticker)
      return next
    })
  }

  if (isLoading) {
    return (
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel" aria-busy="true">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-4 w-24" />
          </li>
        ))}
      </ul>
    )
  }

  if (positions.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-panel px-5 py-10 text-center text-sm text-faint">{emptyMessage}</p>
    )
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
      {positions.map((position) => {
        const isOpen = expanded.has(position.ticker)
        const purchasesLabel = `${position.purchases.length} ${position.purchases.length === 1 ? 'compra' : 'compras'}`

        return (
          <li key={position.ticker}>
            <button
              type="button"
              onClick={() => toggle(position.ticker)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-line/30 focus-visible:bg-line/30 focus-visible:outline-none sm:px-5"
            >
              <ChevronRight
                className={`h-4 w-4 shrink-0 text-faint transition-transform ${isOpen ? 'rotate-90' : ''}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{position.ticker}</p>
                <p className="truncate text-xs text-faint tabular-nums">
                  {formatQuantity(position.quantity)} · PPC{' '}
                  {formatMoney({ amount: position.averagePurchasePrice, currency: position.currency })} · {purchasesLabel}
                </p>
              </div>
              <div className="shrink-0 text-right">{renderValue(position)}</div>
            </button>

            {isOpen && (
              <ul className="border-t border-line bg-app/40">
                {position.purchases.map((purchase) => (
                  <li key={purchase.id} className="flex items-center gap-3 py-2.5 pl-11 pr-3 sm:pl-12 sm:pr-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink-soft tabular-nums">
                        {formatMoney({ amount: purchase.amountInvested, currency: purchase.currency })}
                      </p>
                      <p className="truncate text-xs text-faint tabular-nums">
                        {formatDateAR(new Date(purchase.date))} · {formatQuantity(purchase.quantity)} a{' '}
                        {formatMoney({ amount: purchase.purchasePrice, currency: purchase.currency })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeletePurchase(purchase)}
                      aria-label={`Eliminar compra de ${position.ticker} del ${formatDateAR(new Date(purchase.date))}`}
                      title="Eliminar esta compra"
                      className="rounded-lg p-1.5 text-faint transition-colors hover:bg-negative/10 hover:text-negative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}

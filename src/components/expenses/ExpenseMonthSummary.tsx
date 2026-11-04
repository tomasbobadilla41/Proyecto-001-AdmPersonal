import type { Expense } from '../../types/finance'
import { formatMoney } from '../../utils/currency'
import { toARS } from '../../utils/finance'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'

interface ExpenseMonthSummaryProps {
  /** Gastos del mes elegido, SIN el filtro de tipo (para comparar Fijos vs Flexibles siempre). */
  expenses: Expense[]
  tipoCambio: number
}

/**
 * Total gastado en el mes + barra Fijos/Flexibles, con los mismos colores
 * que la tarjeta 50/30/20 del Dashboard. Reemplaza al gráfico de torta de
 * dos porciones: misma información, una línea de alto.
 */
export function ExpenseMonthSummary({ expenses, tipoCambio }: ExpenseMonthSummaryProps) {
  let fijos = 0
  let flexibles = 0
  let hasUsd = false
  for (const expense of expenses) {
    const montoARS = toARS(expense.monto, expense.moneda, tipoCambio)
    if (expense.expenseType === 'FIJO') fijos += montoARS
    else flexibles += montoARS
    if (expense.moneda === 'USD') hasUsd = true
  }
  const total = fijos + flexibles
  const animatedTotal = useAnimatedNumber(total)
  const pctFijos = total > 0 ? (fijos / total) * 100 : 0

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-5 sm:flex-row sm:items-center sm:gap-8">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-muted">Total del mes</span>
        <span className="text-2xl font-semibold tabular-nums text-ink">
          {formatMoney({ amount: animatedTotal, currency: 'ARS' })}
        </span>
        <span className="text-xs text-faint">
          {expenses.length} {expenses.length === 1 ? 'gasto' : 'gastos'}
          {hasUsd && ` · USD a TC ${tipoCambio}`}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <div
          className="flex h-2 w-full overflow-hidden rounded-full bg-line"
          role="img"
          aria-label={`Fijos ${Math.round(pctFijos)}%, flexibles ${Math.round(100 - pctFijos)}%`}
        >
          {total > 0 && (
            <>
              <div className="h-full bg-fijos transition-all" style={{ width: `${pctFijos}%` }} />
              <div className="h-full bg-flexibles transition-all" style={{ width: `${100 - pctFijos}%` }} />
            </>
          )}
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <SplitLegend dotClassName="bg-fijos" label="Fijos" amount={fijos} />
          <SplitLegend dotClassName="bg-flexibles" label="Flexibles" amount={flexibles} alignRight />
        </div>
      </div>
    </div>
  )
}

interface SplitLegendProps {
  dotClassName: string
  label: string
  amount: number
  alignRight?: boolean
}

function SplitLegend({ dotClassName, label, amount, alignRight = false }: SplitLegendProps) {
  return (
    <span className={`flex items-center gap-1.5 ${alignRight ? 'text-right' : ''}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClassName}`} />
      <span className="text-muted">{label}</span>
      <span className="font-medium tabular-nums text-ink-soft">{formatMoney({ amount, currency: 'ARS' })}</span>
    </span>
  )
}

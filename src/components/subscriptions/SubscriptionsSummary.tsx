import type { SubscriptionSummaryItem } from '../../utils/subscriptions'
import { formatMoney } from '../../utils/currency'
import { MESES_LARGOS, toARS } from '../../utils/finance'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'

interface SubscriptionsSummaryProps {
  /** Solo las activas: son las que forman el gasto mensual. */
  active: SubscriptionSummaryItem[]
  tipoCambio: number
}

/** Total mensual (en ARS) + "N de M cargadas este mes" con barra de progreso. */
export function SubscriptionsSummary({ active, tipoCambio }: SubscriptionsSummaryProps) {
  const total = active.reduce((sum, sub) => sum + toARS(sub.monto, sub.moneda, tipoCambio), 0)
  const hasUsd = active.some((sub) => sub.moneda === 'USD')
  const loaded = active.filter((sub) => sub.loadedThisMonth).length
  const pct = active.length > 0 ? (loaded / active.length) * 100 : 0
  const animatedTotal = useAnimatedNumber(total)
  const monthLabel = MESES_LARGOS[new Date().getMonth()]

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-5 sm:flex-row sm:items-center sm:gap-8">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-muted">Gasto mensual</span>
        <span className="text-2xl font-semibold tabular-nums text-ink">
          {formatMoney({ amount: animatedTotal, currency: 'ARS' })}
        </span>
        <span className="text-xs text-faint">
          {active.length} {active.length === 1 ? 'suscripción activa' : 'suscripciones activas'}
          {hasUsd && ` · USD a TC ${tipoCambio}`}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={active.length}
          aria-valuenow={loaded}
          aria-label={`Suscripciones cargadas en ${monthLabel}`}
        >
          <div className="h-full rounded-full bg-positive transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-faint">
          {loaded === active.length ? (
            <span className="text-positive">Todas cargadas en {monthLabel}</span>
          ) : (
            <>
              <span className="font-medium text-ink-soft">
                {loaded} de {active.length}
              </span>{' '}
              cargadas en {monthLabel} — importá el CSV del mes para completar.
            </>
          )}
        </p>
      </div>
    </div>
  )
}

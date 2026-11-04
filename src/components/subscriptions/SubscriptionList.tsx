import { CheckCircle2, ChevronRight, Repeat } from 'lucide-react'
import type { SubscriptionSummaryItem } from '../../utils/subscriptions'
import { formatMoney } from '../../utils/currency'
import { formatDateAR, MESES_LARGOS, toARS } from '../../utils/finance'

interface SubscriptionListProps {
  active: SubscriptionSummaryItem[]
  inactive: SubscriptionSummaryItem[]
  tipoCambio: number
}

/**
 * Activas (de mayor a menor gasto, con estado del mes) y, plegadas abajo,
 * las que no tienen cargos recientes — que no suman al total mensual.
 */
export function SubscriptionList({ active, inactive, tipoCambio }: SubscriptionListProps) {
  // Orden por monto en ARS: así una suscripción en USD queda donde corresponde
  // por lo que realmente cuesta, no al final por tener un número chico.
  const sortedActive = [...active].sort(
    (a, b) => toARS(b.monto, b.moneda, tipoCambio) - toARS(a.monto, a.moneda, tipoCambio),
  )

  return (
    <div className="flex flex-col gap-6">
      {sortedActive.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="px-1 text-sm font-medium text-muted">Activas · {sortedActive.length}</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
            {sortedActive.map((sub) => (
              <li key={sub.title} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    sub.loadedThisMonth ? 'bg-positive/10 text-positive' : 'bg-line text-muted'
                  }`}
                >
                  {sub.loadedThisMonth ? <CheckCircle2 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{sub.title}</p>
                  <p className="text-xs text-faint">
                    {sub.loadedThisMonth
                      ? `Cargada · ${formatDateAR(sub.fecha).slice(0, 5)}`
                      : `Pendiente · último cargo ${formatDateAR(sub.fecha).slice(0, 5)}`}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums text-ink">
                  {formatMoney({ amount: sub.monto, currency: sub.moneda })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {inactive.length > 0 && (
        // <details> nativo: plegable accesible sin estado extra. Cerrado por defecto.
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-1 text-sm font-medium text-muted hover:text-ink-soft [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
            Sin cargos recientes · {inactive.length}
          </summary>
          <p className="mt-1 px-1 text-xs text-faint">
            No tienen cargos hace más de 2 meses (probablemente las diste de baja). No suman al gasto mensual.
          </p>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
            {inactive.map((sub) => (
              <li key={sub.title} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink-soft">{sub.title}</p>
                  <p className="text-xs text-faint">
                    Último cargo: {MESES_LARGOS[sub.fecha.getUTCMonth()]} {sub.fecha.getUTCFullYear()}
                  </p>
                </div>
                <span className="shrink-0 text-sm tabular-nums text-faint">
                  {formatMoney({ amount: sub.monto, currency: sub.moneda })}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

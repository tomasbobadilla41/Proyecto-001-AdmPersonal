import type { ServiceConfig } from '../../types/finance'
import { formatDueStatus, getDueStatus } from '../../utils/dueDate'
import { MESES_LARGOS } from '../../utils/finance'

interface PaymentsMonthSummaryProps {
  total: number
  paid: number
  /** Primer servicio pendiente (ya ordenado por vencimiento), para destacar "lo próximo a pagar". */
  nextPending: ServiceConfig | undefined
}

/** "3 de 5 pagados" + barra de progreso + próximo vencimiento del mes en curso. */
export function PaymentsMonthSummary({ total, paid, nextPending }: PaymentsMonthSummaryProps) {
  const pct = total > 0 ? (paid / total) * 100 : 0
  const allPaid = total > 0 && paid === total
  const nextStatus = nextPending ? getDueStatus(nextPending.dueDay) : undefined
  const monthLabel = MESES_LARGOS[new Date().getMonth()]

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-5 sm:flex-row sm:items-center sm:gap-8">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-muted">Pagos de {monthLabel}</span>
        <span className="text-2xl font-semibold tabular-nums text-ink">
          {paid} <span className="text-base font-normal text-muted">de {total} pagados</span>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={paid}
          aria-label="Servicios pagados este mes"
        >
          <div className="h-full rounded-full bg-positive transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-faint">
          {allPaid ? (
            <span className="text-positive">¡Todo pagado este mes!</span>
          ) : nextPending && nextStatus ? (
            <>
              Próximo: <span className="font-medium text-ink-soft">{nextPending.title}</span>
              {nextStatus.kind !== 'none' && ` · ${formatDueStatus(nextStatus).toLowerCase()}`}
            </>
          ) : null}
        </p>
      </div>
    </div>
  )
}

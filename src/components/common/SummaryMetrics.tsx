import type { ReactNode } from 'react'

export interface SummaryMetric {
  label: string
  value: ReactNode
  /** Línea chica debajo del valor (ej: "+5,20%", "en vivo desde Binance"). */
  caption?: ReactNode
  /** Clase de color del valor (ej: text-positive / text-negative para el resultado). */
  valueClassName?: string
}

/** Fila de 2-3 métricas de resumen (ej: invertido / valor actual / resultado). */
export function SummaryMetrics({ metrics }: { metrics: SummaryMetric[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-xl border border-line bg-panel p-5 sm:grid-cols-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm text-muted">{metric.label}</span>
          <span className={`truncate text-xl font-semibold tabular-nums sm:text-2xl ${metric.valueClassName ?? 'text-ink'}`}>
            {metric.value}
          </span>
          {metric.caption && <span className="text-xs text-faint">{metric.caption}</span>}
        </div>
      ))}
    </div>
  )
}

import { Zap } from 'lucide-react'
import { useServicesStore } from '../../hooks/useServicesStore'
import { FIXED_CATEGORY_ICONS } from '../../utils/serviceIcons'

/** Lista compacta de "un click para pagar", leyendo el directorio del Centro de Pagos. */
export function QuickPayList() {
  const { services } = useServicesStore()

  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-panel p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted">
        <Zap className="h-4 w-4" />
        Accesos Rápidos de Pago
      </h3>

      {services.length === 0 ? (
        <p className="text-sm text-faint">
          Todavía no configuraste servicios — cargalos en Centro de Pagos.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {services.map((service) => {
            const Icon = FIXED_CATEGORY_ICONS[service.category]

            return (
              <li
                key={service.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-app px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm text-ink-soft">
                  <Icon className="h-4 w-4 shrink-0 text-blue-400" />
                  <span className="truncate">{service.category}</span>
                </span>
                <a
                  href={service.paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-on-accent transition-colors hover:bg-accent-strong"
                >
                  Pagar
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

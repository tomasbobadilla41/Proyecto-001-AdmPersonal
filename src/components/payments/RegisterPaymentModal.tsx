import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { Expense, ServiceConfig } from '../../types/finance'
import type { Currency } from '../../types/money'
import { todayISODate } from '../../utils/finance'

interface RegisterPaymentModalProps {
  /** Servicio para el que se registra el pago de este mes, o `null` si está cerrado. */
  service: ServiceConfig | null
  onClose: () => void
  onSubmit: (expense: Expense) => void
}

const INPUT_CLASSNAME =
  'w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none'

/**
 * Modal chico para el flujo rápido "Registrar Pago" del Centro de Pagos:
 * solo pide monto y moneda (categoría, tipo y fecha se completan solos a
 * partir del servicio), para no obligar a pasar por el formulario completo
 * de gastos cada vez que se paga un servicio fijo del mes.
 */
export function RegisterPaymentModal({ service, onClose, onSubmit }: RegisterPaymentModalProps) {
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<Currency>('ARS')

  useEffect(() => {
    if (service) {
      setMonto('')
      setMoneda('ARS')
    }
  }, [service])

  if (!service) return null
  const currentService = service

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const montoNumerico = Number(monto)
    if (!montoNumerico || montoNumerico <= 0) return

    onSubmit({
      id: `exp-${Date.now()}`,
      fecha: new Date(todayISODate()),
      descripcion: currentService.title,
      monto: montoNumerico,
      moneda,
      expenseType: 'FIJO',
      category: currentService.category,
      serviceId: currentService.id,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-2xl border border-line bg-panel p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">Registrar pago · {service.title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-muted hover:bg-line hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Monto de este mes
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                required
                autoFocus
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className={INPUT_CLASSNAME}
              />
              <select
                aria-label="Moneda"
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as Currency)}
                className="rounded-lg border border-line bg-app px-2 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </label>

          <button
            type="submit"
            className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong"
          >
            Confirmar pago
          </button>
        </form>
      </div>
    </div>
  )
}

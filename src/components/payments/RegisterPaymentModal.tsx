import { useEffect, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import type { Expense, ServiceConfig } from '../../types/finance'
import type { Currency } from '../../types/money'
import { todayISODate } from '../../utils/finance'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'

interface RegisterPaymentModalProps {
  /** Servicio para el que se registra el pago de este mes, o `null` si está cerrado. */
  service: ServiceConfig | null
  onClose: () => void
  /** Async a propósito: el modal espera a que termine antes de volver a habilitar el botón (y recién ahí se cierra desde el padre) — así un segundo click mientras el primero sigue en vuelo no dispara un segundo insert. */
  onSubmit: (expense: Expense) => Promise<void>
  /** Monto detectado por el lector de facturas (IA) — si se pasa, precarga el campo en vez de dejarlo vacío. */
  prefillAmount?: number
}

const INPUT_CLASSNAME =
  'w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none'

/**
 * Modal chico para el flujo rápido "Registrar Pago" del Centro de Pagos:
 * solo pide monto y moneda (categoría, tipo y fecha se completan solos a
 * partir del servicio), para no obligar a pasar por el formulario completo
 * de gastos cada vez que se paga un servicio fijo del mes.
 */
export function RegisterPaymentModal({ service, onClose, onSubmit, prefillAmount }: RegisterPaymentModalProps) {
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<Currency>('ARS')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (service) {
      setMonto(prefillAmount !== undefined ? String(prefillAmount) : '')
      setMoneda('ARS')
      setIsSubmitting(false)
    }
  }, [service, prefillAmount])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!service) return
    const currentService = service
    const montoNumerico = Number(monto)
    // `isSubmitting` corta un segundo submit mientras el primero sigue en
    // vuelo (ej: doble click, o Enter repetido por la red lenta) — sin esto
    // se llegó a guardar el mismo pago dos veces.
    if (!montoNumerico || montoNumerico <= 0 || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        id: `exp-${Date.now()}`,
        fecha: new Date(todayISODate()),
        descripcion: currentService.title,
        monto: montoNumerico,
        moneda,
        expenseType: 'FIJO',
        category: currentService.category,
        serviceId: currentService.id,
      })
    } finally {
      // Si `onSubmit` falló, el padre no cierra el modal — hay que poder
      // reintentar, así que se vuelve a habilitar el botón.
      setIsSubmitting(false)
    }
  }

  return (
    // Dialog de shadcn (antes un overlay hecho a mano): suma cierre con Escape,
    // foco atrapado dentro del modal y la animación del resto de los diálogos.
    <Dialog open={service !== null} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>{service?.title}</DialogDescription>
        </DialogHeader>

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
                disabled={isSubmitting}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className={INPUT_CLASSNAME}
              />
              <select
                aria-label="Moneda"
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as Currency)}
                disabled={isSubmitting}
                className="rounded-lg border border-line bg-app px-2 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar pago
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { EXPENSE_CATEGORIES, type FixedExpenseCategory, type ServiceConfig } from '../../types/finance'

interface ServiceConfigFormDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (service: ServiceConfig) => void
  /** Si se pasa, el formulario edita ese servicio; si no, configura uno nuevo. */
  initialService?: ServiceConfig
  /** Solo aplica cuando se está creando (no en edición): precarga cuenta/categoría sugeridas por el lector de facturas. */
  initialDraft?: { accountNumber?: string; category?: FixedExpenseCategory }
}

const INPUT_CLASSNAME =
  'w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none'

const DEFAULT_CATEGORY: FixedExpenseCategory = EXPENSE_CATEGORIES.FIJO[0]

export function ServiceConfigFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  initialService,
  initialDraft,
}: ServiceConfigFormDrawerProps) {
  const isEditMode = Boolean(initialService)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<FixedExpenseCategory>(DEFAULT_CATEGORY)
  const [accountNumber, setAccountNumber] = useState('')
  const [paymentLink, setPaymentLink] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [dueDay, setDueDay] = useState('')

  // Recarga los campos cada vez que se abre el panel (configurando o editando).
  useEffect(() => {
    if (!isOpen) return
    if (initialService) {
      setTitle(initialService.title)
      setCategory(initialService.category)
      setAccountNumber(initialService.accountNumber ?? '')
      setPaymentLink(initialService.paymentLink ?? '')
      setSenderEmail(initialService.senderEmail ?? '')
      setDueDay(initialService.dueDay ? String(initialService.dueDay) : '')
    } else {
      setTitle('')
      setCategory(initialDraft?.category ?? DEFAULT_CATEGORY)
      setAccountNumber(initialDraft?.accountNumber ?? '')
      setPaymentLink('')
      setSenderEmail('')
      setDueDay('')
    }
  }, [isOpen, initialService, initialDraft])

  if (!isOpen) return null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return

    const parsedDueDay = Number(dueDay)

    // No llama a `onClose` acá: `onSubmit` es async (el alta pega contra
    // Supabase) y el padre es quien cierra el drawer cuando corresponde —
    // si cerráramos acá de entrada, se pisaría cualquier estado que el padre
    // necesite leer recién cuando el `await` del alta termine (ej: el monto
    // precargado por el lector de facturas, que así quedaba en `undefined`
    // antes de que se pudiera usar para abrir "Registrar Pago" encadenado).
    onSubmit({
      id: initialService?.id ?? `svc-${Date.now()}`,
      title: title.trim(),
      category,
      accountNumber: accountNumber.trim() || undefined,
      paymentLink: paymentLink.trim() || undefined,
      senderEmail: senderEmail.trim() || undefined,
      dueDay: dueDay && parsedDueDay >= 1 && parsedDueDay <= 31 ? parsedDueDay : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="flex h-full w-full max-w-sm flex-col gap-6 overflow-y-auto border-l border-line bg-panel p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">
            {isEditMode ? 'Editar servicio' : 'Configurar nuevo servicio'}
          </h3>
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
            Nombre del servicio
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Edenor - Luz casa"
              className={INPUT_CLASSNAME}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Categoría
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FixedExpenseCategory)}
              className={INPUT_CLASSNAME}
            >
              {EXPENSE_CATEGORIES.FIJO.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Día de vencimiento
            <input
              type="number"
              min="1"
              max="31"
              step="1"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              placeholder="Ej: 10"
              className={INPUT_CLASSNAME}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Nro. de cuenta / cliente
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Ej: 123456789 o CBU"
              className={INPUT_CLASSNAME}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Link de pago
            <input
              type="url"
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
              placeholder="https://..."
              className={INPUT_CLASSNAME}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Email de facturación
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="facturas@proveedor.com"
              className={INPUT_CLASSNAME}
            />
            <span className="text-xs text-faint">Casilla desde la que llega la factura (uso futuro).</span>
          </label>

          <button
            type="submit"
            className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong"
          >
            {isEditMode ? 'Guardar cambios' : 'Guardar servicio'}
          </button>
        </form>
      </div>
    </div>
  )
}

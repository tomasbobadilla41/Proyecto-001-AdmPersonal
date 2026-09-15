import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { EXPENSE_CATEGORIES, type FixedExpenseCategory, type ServiceConfig } from '../../types/finance'

interface ServiceConfigFormDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (service: ServiceConfig) => void
  /** Si se pasa, el formulario edita ese servicio; si no, configura uno nuevo. */
  initialService?: ServiceConfig
}

const INPUT_CLASSNAME =
  'w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none'

const DEFAULT_CATEGORY: FixedExpenseCategory = EXPENSE_CATEGORIES.FIJO[0]

export function ServiceConfigFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  initialService,
}: ServiceConfigFormDrawerProps) {
  const isEditMode = Boolean(initialService)

  const [category, setCategory] = useState<FixedExpenseCategory>(DEFAULT_CATEGORY)
  const [accountNumber, setAccountNumber] = useState('')
  const [paymentLink, setPaymentLink] = useState('')

  // Recarga los campos cada vez que se abre el panel (configurando o editando).
  useEffect(() => {
    if (!isOpen) return
    if (initialService) {
      setCategory(initialService.category)
      setAccountNumber(initialService.accountNumber)
      setPaymentLink(initialService.paymentLink)
    } else {
      setCategory(DEFAULT_CATEGORY)
      setAccountNumber('')
      setPaymentLink('')
    }
  }, [isOpen, initialService])

  if (!isOpen) return null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!accountNumber.trim() || !paymentLink.trim()) return

    onSubmit({
      id: initialService?.id ?? `svc-${Date.now()}`,
      category,
      accountNumber: accountNumber.trim(),
      paymentLink: paymentLink.trim(),
    })
    onClose()
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
            Nro. de cuenta / cliente
            <input
              type="text"
              required
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
              required
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
              placeholder="https://..."
              className={INPUT_CLASSNAME}
            />
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

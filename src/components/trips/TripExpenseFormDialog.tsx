import { useEffect, useState, type FormEvent } from 'react'
import type { Currency } from '../../types/money'
import {
  TRIP_EXPENSE_CATEGORIES,
  type Trip,
  type TripExpense,
  type TripExpenseCategory,
  type TripExpenseStatus,
  type TripPaidBy,
} from '../../types/trips'
import { formatMoney } from '../../utils/currency'
import { todayISODate } from '../../utils/finance'
import { ownOutOfPocket, paidByLabel } from '../../utils/trips'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'

interface TripExpenseFormDialogProps {
  isOpen: boolean
  trip: Trip
  onClose: () => void
  onSubmit: (expense: TripExpense) => void
  /** Si se pasa, edita ese gasto; si no, carga uno nuevo. */
  initialExpense?: TripExpense
}

const INPUT_CLASSNAME =
  'w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none'
const MAX_INSTALLMENTS = 24

const STATUS_OPTIONS: { value: TripExpenseStatus; label: string }[] = [
  { value: 'PAGADO', label: 'Pagado' },
  { value: 'PENDIENTE', label: 'Reservado / a pagar' },
]
const PAID_BY_OPTIONS: TripPaidBy[] = ['YO', 'PAREJA', 'COMPARTIDO']

export function TripExpenseFormDialog({ isOpen, trip, onClose, onSubmit, initialExpense }: TripExpenseFormDialogProps) {
  const isEditMode = Boolean(initialExpense)

  const [category, setCategory] = useState<TripExpenseCategory>('Vuelo')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('ARS')
  const [paymentDate, setPaymentDate] = useState(todayISODate())
  const [status, setStatus] = useState<TripExpenseStatus>('PAGADO')
  const [paidBy, setPaidBy] = useState<TripPaidBy>('YO')
  const [installments, setInstallments] = useState('1')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setCategory(initialExpense?.category ?? 'Vuelo')
    setDescription(initialExpense?.description ?? '')
    setAmount(initialExpense ? String(initialExpense.amount) : '')
    setCurrency(initialExpense?.currency ?? 'ARS')
    setPaymentDate(initialExpense?.paymentDate ?? todayISODate())
    setStatus(initialExpense?.status ?? 'PAGADO')
    setPaidBy(initialExpense?.paidBy ?? 'YO')
    setInstallments(String(initialExpense?.installments ?? 1))
    setNotes(initialExpense?.notes ?? '')
  }, [isOpen, initialExpense])

  const amountNumber = Number(amount)
  const installmentsNumber =
    paidBy === 'PAREJA' ? 1 : Math.min(Math.max(Math.trunc(Number(installments)) || 1, 1), MAX_INSTALLMENTS)

  // Vista previa de lo que va a impactar en Gastos (misma regla que buildLinkedExpenses).
  const outOfPocket = amountNumber > 0 ? ownOutOfPocket({ amount: amountNumber, paidBy }) : 0
  const monthlyImpact =
    status !== 'PAGADO'
      ? 'No se carga en Gastos hasta que lo marques como pagado.'
      : outOfPocket <= 0
        ? 'No se carga en tus Gastos: lo pagó tu pareja (te queda como saldo a devolverle).'
        : installmentsNumber > 1
          ? `Se carga en Gastos (Vacaciones) en ${installmentsNumber} cuotas de ${formatMoney({ amount: outOfPocket / installmentsNumber, currency })}, desde el mes siguiente.`
          : `Se carga en Gastos (Vacaciones) por ${formatMoney({ amount: outOfPocket, currency })}.`

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!(amountNumber > 0) || !paymentDate) return

    onSubmit({
      id: initialExpense?.id ?? `trip-exp-${Date.now()}`,
      tripId: trip.id,
      category,
      description: description.trim() || category,
      amount: amountNumber,
      currency,
      paymentDate,
      status,
      paidBy,
      // Si lo pagó la pareja, no se generan cuotas propias en Gastos.
      installments: paidBy === 'PAREJA' ? 1 : installmentsNumber,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar gasto del viaje' : 'Nuevo gasto del viaje'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Categoría
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TripExpenseCategory)}
              className={INPUT_CLASSNAME}
            >
              {TRIP_EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Descripción
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Aerolíneas AEP → SLA (ida y vuelta)"
              className={INPUT_CLASSNAME}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Monto total (de los dos)
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={INPUT_CLASSNAME}
              />
              <select
                aria-label="Moneda"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="rounded-lg border border-line bg-app px-2 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </label>

          <fieldset className="flex flex-col gap-1 text-sm text-ink-soft">
            <legend className="mb-1">Estado</legend>
            <SegmentedControl
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
            />
          </fieldset>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {status === 'PAGADO' ? 'Fecha de pago' : 'Fecha de vencimiento / pago previsto'}
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className={INPUT_CLASSNAME}
            />
          </label>

          <fieldset className="flex flex-col gap-1 text-sm text-ink-soft">
            <legend className="mb-1">¿Quién paga?</legend>
            <SegmentedControl
              options={PAID_BY_OPTIONS.map((value) => ({ value, label: paidByLabel(value, trip) }))}
              value={paidBy}
              onChange={setPaidBy}
            />
            <span className="text-xs text-faint">El gasto se reparte 50/50 entre los dos.</span>
          </fieldset>

          {paidBy !== 'PAREJA' && (
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              Cuotas
              <input
                type="number"
                min="1"
                max={MAX_INSTALLMENTS}
                step="1"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                className={INPUT_CLASSNAME}
              />
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Notas (opcional)
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: código de reserva, seña pagada..."
              className={INPUT_CLASSNAME}
            />
          </label>

          <p className="rounded-lg border border-line bg-app p-3 text-xs text-muted">{monthlyImpact}</p>

          <button
            type="submit"
            className="mt-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong"
          >
            {isEditMode ? 'Guardar cambios' : 'Guardar gasto'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="flex gap-1 rounded-lg border border-line bg-app p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 truncate rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
            value === option.value ? 'bg-panel text-ink shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

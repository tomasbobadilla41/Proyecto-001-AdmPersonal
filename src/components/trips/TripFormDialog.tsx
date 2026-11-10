import { useEffect, useState, type FormEvent } from 'react'
import type { Currency } from '../../types/money'
import type { Trip } from '../../types/trips'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'

interface TripFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (trip: Trip) => void
  /** Si se pasa, el formulario edita ese viaje; si no, crea uno nuevo. */
  initialTrip?: Trip
}

const INPUT_CLASSNAME =
  'w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none'

export function TripFormDialog({ isOpen, onClose, onSubmit, initialTrip }: TripFormDialogProps) {
  const isEditMode = Boolean(initialTrip)

  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [budgetAmount, setBudgetAmount] = useState('')
  const [budgetCurrency, setBudgetCurrency] = useState<Currency>('ARS')

  useEffect(() => {
    if (!isOpen) return
    setName(initialTrip?.name ?? '')
    setDestination(initialTrip?.destination ?? '')
    setStartDate(initialTrip?.startDate ?? '')
    setEndDate(initialTrip?.endDate ?? '')
    setPartnerName(initialTrip?.partnerName ?? '')
    setBudgetAmount(initialTrip?.budget ? String(initialTrip.budget.amount) : '')
    setBudgetCurrency(initialTrip?.budget?.currency ?? 'ARS')
  }, [isOpen, initialTrip])

  const datesInvalid = Boolean(startDate && endDate && endDate < startDate)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !destination.trim() || !startDate || !endDate || datesInvalid) return

    const budgetNumber = Number(budgetAmount)

    // No llama a `onClose` acá: el padre cierra cuando termina el guardado async.
    onSubmit({
      id: initialTrip?.id ?? `trip-${Date.now()}`,
      name: name.trim(),
      destination: destination.trim(),
      startDate,
      endDate,
      partnerName: partnerName.trim() || undefined,
      budget: budgetNumber > 0 ? { amount: budgetNumber, currency: budgetCurrency } : undefined,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar viaje' : 'Nuevo viaje'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Nombre
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ej: "Salta 2026"'
              className={INPUT_CLASSNAME}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Destino
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Ej: Salta y Jujuy"
              className={INPUT_CLASSNAME}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              Ida
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={INPUT_CLASSNAME}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              Vuelta
              <input
                type="date"
                required
                min={startDate || undefined}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={INPUT_CLASSNAME}
              />
            </label>
          </div>
          {datesInvalid && <p className="-mt-2 text-xs text-negative">La vuelta no puede ser antes de la ida.</p>}

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Nombre de tu pareja (opcional)
            <input
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="Se usa para indicar quién pagó cada gasto"
              className={INPUT_CLASSNAME}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Presupuesto total (opcional)
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="0.00"
                className={INPUT_CLASSNAME}
              />
              <select
                aria-label="Moneda del presupuesto"
                value={budgetCurrency}
                onChange={(e) => setBudgetCurrency(e.target.value as Currency)}
                className="rounded-lg border border-line bg-app px-2 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </label>

          <button
            type="submit"
            disabled={datesInvalid}
            className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong disabled:opacity-50"
          >
            {isEditMode ? 'Guardar cambios' : 'Crear viaje'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

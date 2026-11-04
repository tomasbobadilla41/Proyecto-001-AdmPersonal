import { useEffect, useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import type { PropertyIncome } from '../../types/realEstate'
import type { Currency } from '../../types/money'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

interface RentIncomeInputProps {
  propertyId: string
  month: number
  year: number
  /** El `PropertyIncome` de este mes/año, si ya se cargó. */
  existingIncome: PropertyIncome | undefined
  /** Precio actual del contrato vigente, si hay uno — se usa para precargar el monto cuando todavía no se cargó el ingreso de este mes. */
  suggestedAmount?: number
  onSave: (income: PropertyIncome) => void
}

export function RentIncomeInput({ propertyId, month, year, existingIncome, suggestedAmount, onSave }: RentIncomeInputProps) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('ARS')

  useEffect(() => {
    if (existingIncome) {
      setAmount(String(existingIncome.amount))
      setCurrency(existingIncome.currency)
    } else {
      // Sin ingreso cargado todavía este mes: precarga el precio del contrato
      // vigente como punto de partida (sigue siendo editable, no se guarda
      // nada hasta que se apriete "Guardar").
      setAmount(suggestedAmount ? String(suggestedAmount) : '')
      setCurrency('ARS')
    }
  }, [existingIncome, suggestedAmount, month, year])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const numero = Number(amount)
    if (!numero || numero <= 0) return
    onSave({
      id: existingIncome?.id ?? `pinc-${Date.now()}`,
      propertyId,
      month,
      year,
      amount: numero,
      currency,
    })
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-ink">Alquiler del mes</h3>
        {existingIncome ? (
          <span className="flex items-center gap-1 text-xs font-medium text-positive">
            <Check className="h-3.5 w-3.5" />
            Cobrado
          </span>
        ) : (
          <span className="text-xs text-faint">Sin cobrar</span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          aria-label="Monto cobrado"
          className="w-40 tabular-nums"
        />
        <select
          aria-label="Moneda"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
        <Button type="submit" variant={existingIncome ? 'outline' : 'default'}>
          {existingIncome ? 'Actualizar' : 'Marcar cobrado'}
        </Button>
      </form>

      {!existingIncome && suggestedAmount ? (
        <p className="text-xs text-faint">Precargado con el precio del contrato — todavía no se guardó.</p>
      ) : null}
    </section>
  )
}

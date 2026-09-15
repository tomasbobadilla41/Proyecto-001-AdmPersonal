import { useEffect, useState } from 'react'
import type { PropertyIncome } from '../../types/realEstate'
import type { Currency } from '../../types/money'

interface RentIncomeInputProps {
  propertyId: string
  month: number
  year: number
  /** El `PropertyIncome` de este mes/año, si ya se cargó. */
  existingIncome: PropertyIncome | undefined
  onSave: (income: PropertyIncome) => void
}

const INPUT_CLASSNAME =
  'w-32 rounded-lg border border-line bg-app px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none'

export function RentIncomeInput({ propertyId, month, year, existingIncome, onSave }: RentIncomeInputProps) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('ARS')

  useEffect(() => {
    setAmount(existingIncome ? String(existingIncome.amount) : '')
    setCurrency(existingIncome?.currency ?? 'ARS')
  }, [existingIncome, month, year])

  function handleSave() {
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
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-panel p-5">
      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        Alquiler Cobrado
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
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
      <button
        type="button"
        onClick={handleSave}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong"
      >
        Guardar
      </button>
      {existingIncome && (
        <span className="pb-2 text-xs text-faint">Ya cargado este mes — se actualiza al guardar de nuevo.</span>
      )}
    </div>
  )
}

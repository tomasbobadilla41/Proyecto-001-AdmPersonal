import { useState } from 'react'
import { Pencil, Wallet } from 'lucide-react'
import type { Income } from '../../types/finance'
import { formatMoney, formatUsdEquivalent } from '../../utils/currency'
import { toARS } from '../../utils/finance'
import { StatCard } from '../common/StatCard'

const INPUT_CLASSNAME =
  'rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none'

interface SalaryCardProps {
  mes: number
  anio: number
  income: Income | undefined
  tipoCambio: number
  onSave: (income: Income) => void
}

export function SalaryCard({ mes, anio, income, tipoCambio, onSave }: SalaryCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [sueldoARS, setSueldoARS] = useState('')
  const [sueldoUSD, setSueldoUSD] = useState('')

  function startEditing() {
    setSueldoARS(income ? String(income.sueldoARS) : '')
    setSueldoUSD(income ? String(income.sueldoUSD) : '')
    setIsEditing(true)
  }

  function handleSave() {
    onSave({
      id: income?.id ?? `inc-${anio}-${String(mes).padStart(2, '0')}`,
      mes,
      anio,
      sueldoARS: Number(sueldoARS) || 0,
      sueldoUSD: Number(sueldoUSD) || 0,
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <StatCard title="Ingresos Totales" icon={Wallet} iconClassName="text-emerald-400">
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Sueldo ARS
            <input
              type="number"
              min="0"
              step="0.01"
              autoFocus
              value={sueldoARS}
              onChange={(e) => setSueldoARS(e.target.value)}
              className={INPUT_CLASSNAME}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Sueldo USD
            <input
              type="number"
              min="0"
              step="0.01"
              value={sueldoUSD}
              onChange={(e) => setSueldoUSD(e.target.value)}
              className={INPUT_CLASSNAME}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        </div>
      </StatCard>
    )
  }

  if (!income) {
    return (
      <StatCard title="Ingresos Totales" icon={Wallet} iconClassName="text-emerald-400">
        <p className="text-sm text-slate-500">Todavía no cargaste el sueldo de este mes.</p>
        <button
          type="button"
          onClick={startEditing}
          className="self-start rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
        >
          Cargar sueldo
        </button>
      </StatCard>
    )
  }

  const totalARS = income.sueldoARS + toARS(income.sueldoUSD, 'USD', tipoCambio)
  const totalEnUSD = tipoCambio > 0 ? totalARS / tipoCambio : 0

  return (
    <StatCard title="Ingresos Totales" icon={Wallet} iconClassName="text-emerald-400">
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl font-semibold text-slate-100">
          {formatMoney({ amount: totalARS, currency: 'ARS' })}
        </span>
        <button
          type="button"
          onClick={startEditing}
          aria-label="Editar sueldo"
          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-slate-500">
        ≈ {formatUsdEquivalent(totalEnUSD)} (a TC {tipoCambio})
      </p>
    </StatCard>
  )
}

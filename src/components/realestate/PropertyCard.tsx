import { Building2 } from 'lucide-react'
import { formatMoney } from '../../utils/currency'

interface PropertyCardProps {
  name: string
  address: string
  /** Alquiler cobrado este mes, en ARS. */
  alquilerCobrado: number
  /** Gastos pagados (PAID/AUTO_DEBIT) este mes, en ARS. */
  gastosPagados: number
  onManage: () => void
}

export function PropertyCard({ name, address, alquilerCobrado, gastosPagados, onManage }: PropertyCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-blue-400" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-100">{name}</p>
          <p className="truncate text-xs text-slate-500">{address}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Alquiler Cobrado</span>
          <span className="font-medium text-emerald-400">
            {formatMoney({ amount: alquilerCobrado, currency: 'ARS' })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Gastos Pagados</span>
          <span className="font-medium text-slate-100">
            {formatMoney({ amount: gastosPagados, currency: 'ARS' })}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onManage}
        className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
      >
        Ver Detalle / Gestionar
      </button>
    </div>
  )
}

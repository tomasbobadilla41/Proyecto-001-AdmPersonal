import { Home } from 'lucide-react'
import { formatMoney } from '../../utils/currency'
import { StatCard } from '../common/StatCard'

interface FixedExpensesCardProps {
  /** Suma real de gastos FIJO del mes, en ARS. */
  total: number
  /** Límite ideal (50% del ingreso), en ARS. */
  limiteIdeal: number
}

export function FixedExpensesCard({ total, limiteIdeal }: FixedExpensesCardProps) {
  const isOverLimit = total > limiteIdeal

  return (
    <StatCard title="Gastos Fijos (50%)" icon={Home} iconClassName="text-blue-400">
      <span className="text-2xl font-semibold text-slate-100">
        {formatMoney({ amount: total, currency: 'ARS' })}
      </span>
      <p className={`text-xs ${isOverLimit ? 'text-rose-400' : 'text-slate-500'}`}>
        Límite ideal (50%): {formatMoney({ amount: limiteIdeal, currency: 'ARS' })}
      </p>
    </StatCard>
  )
}

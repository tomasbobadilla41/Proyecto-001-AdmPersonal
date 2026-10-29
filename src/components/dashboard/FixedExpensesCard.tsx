import { Home } from 'lucide-react'
import { formatMoney } from '../../utils/currency'
import { StatCard } from '../common/StatCard'
import { ProgressBar } from '../common/ProgressBar'

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
      <span className="text-2xl font-semibold text-ink">
        {formatMoney({ amount: total, currency: 'ARS' })}
      </span>
      <ProgressBar
        value={limiteIdeal > 0 ? (total / limiteIdeal) * 100 : 0}
        indicatorClassName={isOverLimit ? 'bg-rose-400' : 'bg-blue-400'}
      />
      <p className={`text-xs ${isOverLimit ? 'text-rose-400' : 'text-faint'}`}>
        Límite ideal (50%): {formatMoney({ amount: limiteIdeal, currency: 'ARS' })}
      </p>
    </StatCard>
  )
}

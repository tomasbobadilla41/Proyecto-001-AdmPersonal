import { ShoppingBag } from 'lucide-react'
import { formatMoney } from '../../utils/currency'
import { StatCard } from '../common/StatCard'

interface FlexibleExpensesCardProps {
  /** Suma real de gastos FLEXIBLE del mes, en ARS. */
  total: number
  /** Límite ideal (30% del ingreso), en ARS. */
  limiteIdeal: number
}

export function FlexibleExpensesCard({ total, limiteIdeal }: FlexibleExpensesCardProps) {
  const isOverLimit = total > limiteIdeal

  return (
    <StatCard title="Gastos Flexibles (30%)" icon={ShoppingBag} iconClassName="text-orange-400">
      <span className="text-2xl font-semibold text-ink">
        {formatMoney({ amount: total, currency: 'ARS' })}
      </span>
      <p className={`text-xs ${isOverLimit ? 'text-rose-400' : 'text-faint'}`}>
        Límite ideal (30%): {formatMoney({ amount: limiteIdeal, currency: 'ARS' })}
      </p>
    </StatCard>
  )
}

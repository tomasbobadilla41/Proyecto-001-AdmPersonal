import { DollarSign } from 'lucide-react'
import type { Money } from '../types/money'
import { formatMoney } from '../utils/currency'

interface MoneyBadgeProps {
  money: Money
}

export function MoneyBadge({ money }: MoneyBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
      <DollarSign className="h-4 w-4" />
      {formatMoney(money)}
    </span>
  )
}

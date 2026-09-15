import { PiggyBank } from 'lucide-react'
import { formatMoney } from '../../utils/currency'
import { StatCard } from '../common/StatCard'

interface SavingsCardProps {
  /** Ingresos Totales - Gastos Fijos reales - Gastos Flexibles reales. */
  remanente: number
  /** Meta ideal (20% del ingreso). */
  metaIdeal: number
}

export function SavingsCard({ remanente, metaIdeal }: SavingsCardProps) {
  const isPositive = remanente >= 0

  return (
    <StatCard
      title="Ahorro e Inversión (20%)"
      icon={PiggyBank}
      iconClassName={isPositive ? 'text-emerald-400' : 'text-rose-400'}
    >
      <span className={`text-2xl font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
        {formatMoney({ amount: remanente, currency: 'ARS' })}
      </span>
      <p className="text-xs text-slate-500">Meta ideal (20%): {formatMoney({ amount: metaIdeal, currency: 'ARS' })}</p>
    </StatCard>
  )
}

import { PiggyBank } from 'lucide-react'
import { formatMoney } from '../../utils/currency'
import { StatCard } from '../common/StatCard'
import { ProgressBar } from '../common/ProgressBar'

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
      {/* Acá la barra mide cuánto de la META se alcanzó (al revés que en las otras dos tarjetas, donde más lleno es peor). */}
      <ProgressBar
        value={metaIdeal > 0 ? (remanente / metaIdeal) * 100 : 0}
        indicatorClassName={isPositive ? 'bg-emerald-400' : 'bg-rose-400'}
      />
      <p className="text-xs text-faint">Meta ideal (20%): {formatMoney({ amount: metaIdeal, currency: 'ARS' })}</p>
    </StatCard>
  )
}

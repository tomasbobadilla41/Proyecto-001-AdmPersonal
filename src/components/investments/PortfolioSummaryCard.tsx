import { Briefcase } from 'lucide-react'
import type { InvestmentPosition } from '../../types/finance'
import { formatMoney } from '../../utils/currency'
import { formatPercentage } from '../../utils/finance'
import { calculatePortfolioTotals } from '../../utils/investments'
import { StatCard } from '../common/StatCard'

interface PortfolioSummaryCardProps {
  positions: InvestmentPosition[]
  tipoCambio: number
}

export function PortfolioSummaryCard({ positions, tipoCambio }: PortfolioSummaryCardProps) {
  const { valorTotalARS, costoTotalARS, resultadoTotalARS } = calculatePortfolioTotals(positions, tipoCambio)
  const isPositive = resultadoTotalARS >= 0
  const porcentajeTotal = costoTotalARS > 0 ? resultadoTotalARS / costoTotalARS : 0

  return (
    <StatCard title="Valor Total de la Cartera" icon={Briefcase} iconClassName="text-emerald-400">
      <span className="text-2xl font-semibold text-slate-100">
        {formatMoney({ amount: valorTotalARS, currency: 'ARS' })}
      </span>
      <p className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
        {formatMoney({ amount: resultadoTotalARS, currency: 'ARS' })} ({formatPercentage(porcentajeTotal)})
      </p>
      <p className="text-xs text-slate-500">
        Todas las posiciones estandarizadas a ARS (TC estimado {tipoCambio})
      </p>
    </StatCard>
  )
}

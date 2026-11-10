import { PieChart as PieChartIcon } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { TripExpense } from '../../types/trips'
import { useTheme } from '../../hooks/useTheme'
import { CHART_PALETTES } from '../../utils/chartTheme'
import { formatMoney } from '../../utils/currency'
import { totalsByTripCategory, TRIP_CATEGORY_STYLE } from '../../utils/trips'

interface TripCategoryChartProps {
  expenses: TripExpense[]
  tipoCambio: number
}

/** Torta del viaje por categoría (todo convertido a ARS), con leyenda propia con montos y porcentajes. */
export function TripCategoryChart({ expenses, tipoCambio }: TripCategoryChartProps) {
  const { theme } = useTheme()
  const palette = CHART_PALETTES[theme]
  const data = totalsByTripCategory(expenses, tipoCambio)
  const total = data.reduce((sum, d) => sum + d.total, 0)

  return (
    <div className="flex flex-col rounded-xl border border-line bg-panel p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted">
        <PieChartIcon className="h-4 w-4" />
        En qué se va el viaje
      </h3>

      {data.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-faint">Sin gastos cargados.</div>
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="total" nameKey="category" innerRadius="58%" outerRadius="95%" paddingAngle={2}>
                  {data.map((entry) => (
                    <Cell key={entry.category} fill={TRIP_CATEGORY_STYLE[entry.category].chartColor} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    border: `1px solid ${palette.tooltipBorder}`,
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: palette.tooltipText }}
                  itemStyle={{ color: palette.tooltipText }}
                  formatter={(value) => formatMoney({ amount: Number(value), currency: 'ARS' })}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="flex w-full flex-col gap-2 text-sm">
            {data.map((entry) => (
              <li key={entry.category} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: TRIP_CATEGORY_STYLE[entry.category].chartColor }}
                />
                <span className="min-w-0 flex-1 truncate text-ink-soft">{entry.category}</span>
                <span className="tabular-nums text-ink">{formatMoney({ amount: entry.total, currency: 'ARS' })}</span>
                <span className="w-10 text-right text-xs tabular-nums text-faint">
                  {total > 0 ? Math.round((entry.total / total) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

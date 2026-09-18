import { PieChart as PieChartIcon } from 'lucide-react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { Expense, ExpenseCategory } from '../../types/finance'
import { CATEGORY_COLORS } from '../../utils/categoryColors'
import { toARS } from '../../utils/finance'
import { useTheme } from '../../hooks/useTheme'
import { CHART_PALETTES } from '../../utils/chartTheme'

interface ExpenseBreakdownWidgetProps {
  /** Gastos ya filtrados al mes actual. */
  expenses: Expense[]
  tipoCambio: number
}

/** Torta de gastos del mes actual, agrupados por Categoría. */
export function ExpenseBreakdownWidget({ expenses, tipoCambio }: ExpenseBreakdownWidgetProps) {
  const { theme } = useTheme()
  const palette = CHART_PALETTES[theme]

  const totalsByCategory = new Map<ExpenseCategory, number>()
  for (const expense of expenses) {
    const montoARS = toARS(expense.monto, expense.moneda, tipoCambio)
    totalsByCategory.set(expense.category, (totalsByCategory.get(expense.category) ?? 0) + montoARS)
  }

  const data = Array.from(totalsByCategory.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-panel p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted">
        <PieChartIcon className="h-4 w-4" />
        Gastos por Categoría (mes actual)
      </h3>

      {data.length === 0 ? (
        <div className="flex h-72 items-center justify-center text-sm text-faint">
          Sin gastos cargados este mes.
        </div>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="total" nameKey="category" innerRadius="50%" outerRadius="80%" paddingAngle={2}>
                {data.map((entry) => (
                  <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category].chartColor} />
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
                formatter={(value) => `$${Number(value).toLocaleString('es-AR')}`}
              />
              <Legend
                verticalAlign="bottom"
                height={64}
                wrapperStyle={{ color: palette.axis, fontSize: 11, lineHeight: '1.4rem' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

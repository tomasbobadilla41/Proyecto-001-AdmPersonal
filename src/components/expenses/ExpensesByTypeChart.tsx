import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { Expense, ExpenseType } from '../../types/finance'
import { toARS } from '../../utils/finance'
import { useTheme } from '../../hooks/useTheme'
import { CHART_PALETTES } from '../../utils/chartTheme'

interface ExpensesByTypeChartProps {
  expenses: Expense[]
  tipoCambio: number
}

const TYPE_LABELS: Record<ExpenseType, string> = {
  FIJO: 'Gastos Fijos',
  FLEXIBLE: 'Gastos Flexibles',
}

// Mismos colores que el badge de Tipo en la tabla: azul para Fijo, naranja
// para Flexible. Semánticos a propósito: no cambian con el tema.
const TYPE_COLORS: Record<ExpenseType, string> = {
  FIJO: '#60a5fa',
  FLEXIBLE: '#fb923c',
}

export function ExpensesByTypeChart({ expenses, tipoCambio }: ExpensesByTypeChartProps) {
  const { theme } = useTheme()
  const palette = CHART_PALETTES[theme]

  const totalsByType = new Map<ExpenseType, number>()
  for (const expense of expenses) {
    const montoARS = toARS(expense.monto, expense.moneda, tipoCambio)
    totalsByType.set(expense.expenseType, (totalsByType.get(expense.expenseType) ?? 0) + montoARS)
  }

  const data = (['FIJO', 'FLEXIBLE'] as const)
    .map((type) => ({ type, label: TYPE_LABELS[type], total: totalsByType.get(type) ?? 0 }))
    .filter((entry) => entry.total > 0)

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-panel p-5">
      <h3 className="mb-4 text-sm font-medium text-muted">Gastos Fijos vs Flexibles</h3>
      {data.length === 0 ? (
        <div className="flex h-72 items-center justify-center text-sm text-faint">
          Sin gastos cargados para este período.
        </div>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="total" nameKey="label" innerRadius="50%" outerRadius="80%" paddingAngle={2}>
                {data.map((entry) => (
                  <Cell key={entry.type} fill={TYPE_COLORS[entry.type]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: palette.tooltipBg, border: `1px solid ${palette.tooltipBorder}`, borderRadius: 8 }}
                labelStyle={{ color: palette.tooltipText }}
                itemStyle={{ color: palette.tooltipText }}
                formatter={(value) => `$${Number(value).toLocaleString('es-AR')}`}
              />
              <Legend verticalAlign="bottom" height={48} wrapperStyle={{ color: palette.axis, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

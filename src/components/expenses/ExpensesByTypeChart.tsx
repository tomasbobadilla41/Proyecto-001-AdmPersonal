import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { Expense, ExpenseType } from '../../types/finance'
import { toARS } from '../../utils/finance'

interface ExpensesByTypeChartProps {
  expenses: Expense[]
  tipoCambio: number
}

const TYPE_LABELS: Record<ExpenseType, string> = {
  FIJO: 'Gastos Fijos',
  FLEXIBLE: 'Gastos Flexibles',
}

// Mismos colores que el badge de Tipo en la tabla: azul para Fijo, naranja para Flexible.
const TYPE_COLORS: Record<ExpenseType, string> = {
  FIJO: '#60a5fa',
  FLEXIBLE: '#fb923c',
}

export function ExpensesByTypeChart({ expenses, tipoCambio }: ExpensesByTypeChartProps) {
  const totalsByType = new Map<ExpenseType, number>()
  for (const expense of expenses) {
    const montoARS = toARS(expense.monto, expense.moneda, tipoCambio)
    totalsByType.set(expense.expenseType, (totalsByType.get(expense.expenseType) ?? 0) + montoARS)
  }

  const data = (['FIJO', 'FLEXIBLE'] as const)
    .map((type) => ({ type, label: TYPE_LABELS[type], total: totalsByType.get(type) ?? 0 }))
    .filter((entry) => entry.total > 0)

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="mb-4 text-sm font-medium text-slate-400">Gastos Fijos vs Flexibles</h3>
      {data.length === 0 ? (
        <div className="flex h-72 items-center justify-center text-sm text-slate-500">
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
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
                itemStyle={{ color: '#e2e8f0' }}
                formatter={(value) => `$${Number(value).toLocaleString('es-AR')}`}
              />
              <Legend verticalAlign="bottom" height={48} wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

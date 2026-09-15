import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MonthlySummary } from '../../types/finance'
import { MESES_CORTOS } from '../../utils/finance'
import { useTheme } from '../../hooks/useTheme'
import { CHART_PALETTES } from '../../utils/chartTheme'

interface IncomeExpenseChartProps {
  summaries: MonthlySummary[]
}

export function IncomeExpenseChart({ summaries }: IncomeExpenseChartProps) {
  const { theme } = useTheme()
  const palette = CHART_PALETTES[theme]

  const data = summaries.map((s) => ({
    periodo: `${MESES_CORTOS[s.mes - 1]} ${String(s.anio).slice(2)}`,
    Ingresos: Math.round(s.ingresosTotalesARS),
    Gastos: Math.round(s.gastosTotales),
  }))

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <h3 className="mb-4 text-sm font-medium text-muted">Ingresos vs Gastos (últimos meses)</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
            <XAxis
              dataKey="periodo"
              stroke={palette.axis}
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: palette.grid }}
            />
            <YAxis
              stroke={palette.axis}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
            />
            <Tooltip
              cursor={{ fill: palette.grid }}
              contentStyle={{ backgroundColor: palette.tooltipBg, border: `1px solid ${palette.tooltipBorder}`, borderRadius: 8 }}
              labelStyle={{ color: palette.tooltipText }}
              itemStyle={{ color: palette.tooltipText }}
              formatter={(value) => `$${Number(value).toLocaleString('es-AR')}`}
            />
            <Legend wrapperStyle={{ color: palette.axis, fontSize: 12 }} />
            <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

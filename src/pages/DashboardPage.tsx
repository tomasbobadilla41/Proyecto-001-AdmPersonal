import { useMemo, useState } from 'react'
import { SalaryCard } from '../components/dashboard/SalaryCard'
import { BudgetRuleCard } from '../components/dashboard/BudgetRuleCard'
import { ExchangeRateInput } from '../components/dashboard/ExchangeRateInput'
import { IncomeExpenseChart } from '../components/dashboard/IncomeExpenseChart'
import { MonthSelector } from '../components/dashboard/MonthSelector'
import { QuickPayList } from '../components/dashboard/QuickPayList'
import { ActiveInstallmentsWidget } from '../components/dashboard/ActiveInstallmentsWidget'
import { ExpenseBreakdownWidget } from '../components/dashboard/ExpenseBreakdownWidget'
import { useExpenseStore } from '../hooks/useExpenseStore'
import { useIncomeStore } from '../hooks/useIncomeStore'
import { useExchangeRateStore } from '../hooks/useExchangeRateStore'
import { calculateActualSplit, calculateBudgetRule } from '../utils/budgetRule'
import {
  calculateMonthlySummaries,
  calculateMonthlySummary,
  getExchangeRate,
  getTrailingPeriods,
  MESES_LARGOS,
} from '../utils/finance'

/** Cantidad de meses a mostrar en el gráfico comparativo (siempre los últimos N reales, sin importar el mes elegido en el selector). */
const MESES_A_MOSTRAR = 6
/** Cantidad de meses que ofrece el selector del Dashboard (el actual + los 11 anteriores). */
const MESES_SELECTOR = 12

export function DashboardPage() {
  const { expenses } = useExpenseStore()
  const { incomes, upsertIncome } = useIncomeStore()
  const { exchangeRates, upsertExchangeRate } = useExchangeRateStore()

  const periodos = useMemo(() => getTrailingPeriods(MESES_A_MOSTRAR), [])
  const summaries = useMemo(
    () =>
      calculateMonthlySummaries(periodos, incomes, expenses, (mes, anio) =>
        getExchangeRate(exchangeRates, mes, anio),
      ),
    [periodos, incomes, expenses, exchangeRates],
  )

  // Selector de mes del Dashboard: el actual + los 11 anteriores, de más
  // nuevo a más viejo. Por defecto arranca en el mes real de hoy.
  const selectorPeriods = useMemo(() => getTrailingPeriods(MESES_SELECTOR), [])
  const [selectedPeriod, setSelectedPeriod] = useState(() => selectorPeriods.at(-1)!)

  const current = useMemo(
    () =>
      calculateMonthlySummary(
        selectedPeriod.mes,
        selectedPeriod.anio,
        incomes,
        expenses,
        getExchangeRate(exchangeRates, selectedPeriod.mes, selectedPeriod.anio),
      ),
    [selectedPeriod, incomes, expenses, exchangeRates],
  )
  const currentIncome = incomes.find((i) => i.mes === current.mes && i.anio === current.anio)

  // Regla 50/30/20: montos ideales según el ingreso, y lo que realmente se
  // gastó en el mes en cada tipo (se recalcula solo: depende de `expenses`,
  // que viene del store — cada `addExpense`/`updateExpense`/`removeExpense`
  // dispara un re-render de este componente con los totales al día).
  const budget = calculateBudgetRule(current.ingresosTotalesARS)
  const { fijosReal, flexiblesReal } = useMemo(
    () => calculateActualSplit(expenses, current.mes, current.anio, current.tipoCambioUsado),
    [expenses, current.mes, current.anio, current.tipoCambioUsado],
  )

  const currentMonthExpenses = useMemo(
    () =>
      expenses.filter(
        (e) => e.fecha.getUTCMonth() + 1 === current.mes && e.fecha.getUTCFullYear() === current.anio,
      ),
    [expenses, current.mes, current.anio],
  )

  function handleSaveExchangeRate(valor: number) {
    void upsertExchangeRate({
      id: `xr-${current.anio}-${String(current.mes).padStart(2, '0')}`,
      mes: current.mes,
      anio: current.anio,
      valor,
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Resumen</p>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            {MESES_LARGOS[current.mes - 1]} {current.anio}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthSelector periods={selectorPeriods} selected={selectedPeriod} onChange={setSelectedPeriod} />
          <ExchangeRateInput
            mes={current.mes}
            anio={current.anio}
            valor={current.tipoCambioUsado}
            onSave={handleSaveExchangeRate}
          />
        </div>
      </div>

      {/* Lo primero que se ve: cuánto entró y cómo se repartió. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SalaryCard
          mes={current.mes}
          anio={current.anio}
          income={currentIncome}
          tipoCambio={current.tipoCambioUsado}
          onSave={upsertIncome}
        />
        <div className="lg:col-span-2">
          <BudgetRuleCard
            ingresoARS={current.ingresosTotalesARS}
            fijosReal={fijosReal}
            flexiblesReal={flexiblesReal}
            budget={budget}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <IncomeExpenseChart summaries={summaries} />
        </div>
        <QuickPayList />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ExpenseBreakdownWidget expenses={currentMonthExpenses} tipoCambio={current.tipoCambioUsado} />
        <ActiveInstallmentsWidget expenses={currentMonthExpenses} />
      </div>
    </div>
  )
}

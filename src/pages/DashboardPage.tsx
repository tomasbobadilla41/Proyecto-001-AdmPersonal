import { useMemo } from 'react'
import { SalaryCard } from '../components/dashboard/SalaryCard'
import { FixedExpensesCard } from '../components/dashboard/FixedExpensesCard'
import { FlexibleExpensesCard } from '../components/dashboard/FlexibleExpensesCard'
import { SavingsCard } from '../components/dashboard/SavingsCard'
import { ExchangeRateInput } from '../components/dashboard/ExchangeRateInput'
import { IncomeExpenseChart } from '../components/dashboard/IncomeExpenseChart'
import { QuickPayList } from '../components/dashboard/QuickPayList'
import { ActiveInstallmentsWidget } from '../components/dashboard/ActiveInstallmentsWidget'
import { ExpenseBreakdownWidget } from '../components/dashboard/ExpenseBreakdownWidget'
import { useExpenseStore } from '../hooks/useExpenseStore'
import { useIncomeStore } from '../hooks/useIncomeStore'
import { useExchangeRateStore } from '../hooks/useExchangeRateStore'
import { calculateActualSplit, calculateBudgetRule } from '../utils/budgetRule'
import { calculateMonthlySummaries, getExchangeRate, getTrailingPeriods, MESES_LARGOS } from '../utils/finance'

/** Cantidad de meses a mostrar en el gráfico comparativo. */
const MESES_A_MOSTRAR = 6

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

  // `getTrailingPeriods` siempre incluye el mes actual como último elemento.
  const current = summaries.at(-1)!
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
  const remanente = current.ingresosTotalesARS - fijosReal - flexiblesReal

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">
            Resumen de {MESES_LARGOS[current.mes - 1]} {current.anio}
          </h2>
          <p className="text-sm text-muted">Métricas del mes actual — regla 50/30/20</p>
        </div>
        <ExchangeRateInput
          mes={current.mes}
          anio={current.anio}
          valor={current.tipoCambioUsado}
          onSave={handleSaveExchangeRate}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SalaryCard
          mes={current.mes}
          anio={current.anio}
          income={currentIncome}
          tipoCambio={current.tipoCambioUsado}
          onSave={upsertIncome}
        />
        <FixedExpensesCard total={fijosReal} limiteIdeal={budget.fijos} />
        <FlexibleExpensesCard total={flexiblesReal} limiteIdeal={budget.flexibles} />
        <SavingsCard remanente={remanente} metaIdeal={budget.ahorro} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <IncomeExpenseChart summaries={summaries} />
        </div>
        <QuickPayList />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ActiveInstallmentsWidget expenses={currentMonthExpenses} />
        <ExpenseBreakdownWidget expenses={currentMonthExpenses} tipoCambio={current.tipoCambioUsado} />
      </div>
    </div>
  )
}

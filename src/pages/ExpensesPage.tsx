import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { Expense } from '../types/finance'
import { CategoryBadge } from '../components/expenses/CategoryBadge'
import { ExpenseTypeBadge } from '../components/expenses/ExpenseTypeBadge'
import { MonthYearSelector } from '../components/expenses/MonthYearSelector'
import { ExpensesByTypeChart } from '../components/expenses/ExpensesByTypeChart'
import { ExpenseFormDrawer } from '../components/expenses/ExpenseFormDrawer'
import { FloatingActionButton } from '../components/common/FloatingActionButton'
import { useFinanceStore } from '../hooks/useFinanceStore'
import { formatMoney } from '../utils/currency'
import { formatDateAR, getAvailableYears, getExchangeRate } from '../utils/finance'

type ExpenseFormState = { mode: 'create' } | { mode: 'edit'; expense: Expense } | null

export function ExpensesPage() {
  const { expenses, exchangeRates, addExpenses, updateExpense, removeExpense } = useFinanceStore()
  const [formState, setFormState] = useState<ExpenseFormState>(null)

  // Arranca en el mes calendario real de hoy — igual que el Dashboard —, no
  // en el mes del gasto "más reciente" cargado. Con cuotas/recurrencia una
  // sola carga puede generar meses varios meses hacia el futuro, así que
  // "más reciente" podía terminar siendo, por ej., la última cuota (a 6
  // meses de hoy) y esta pantalla se abría ahí sin avisar.
  const [mes, setMes] = useState(() => new Date().getMonth() + 1)
  const [anio, setAnio] = useState(() => new Date().getFullYear())

  const years = useMemo(() => getAvailableYears(expenses), [expenses])
  const tipoCambio = getExchangeRate(exchangeRates, mes, anio)

  const filteredExpenses = useMemo(
    () =>
      expenses
        .filter((e) => e.fecha.getUTCMonth() + 1 === mes && e.fecha.getUTCFullYear() === anio)
        .sort((a, b) => b.fecha.getTime() - a.fecha.getTime()),
    [expenses, mes, anio],
  )

  function handleDelete(expense: Expense) {
    if (window.confirm(`¿Eliminar el gasto "${expense.descripcion}"?`)) {
      removeExpense(expense.id)
    }
  }

  function handleSubmit(expenses: Expense[]) {
    if (formState?.mode === 'edit') {
      updateExpense(expenses[0])
    } else {
      addExpenses(expenses)
    }
    setFormState(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">Gastos</h2>
          <p className="text-sm text-muted">Detalle de gastos por mes, como en la planilla</p>
        </div>
        <MonthYearSelector mes={mes} anio={anio} years={years} onMesChange={setMes} onAnioChange={setAnio} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="overflow-x-auto rounded-2xl border border-line bg-panel lg:col-span-2">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel/70 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Descripción</th>
                <th className="px-4 py-3 text-right font-medium">Monto</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="text-ink-soft">
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {formatDateAR(expense.fecha)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <ExpenseTypeBadge expenseType={expense.expenseType} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <CategoryBadge category={expense.category} />
                      {expense.subcategoria && (
                        <span className="text-xs text-faint">{expense.subcategoria}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{expense.descripcion}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                    {formatMoney({ amount: expense.monto, currency: expense.moneda })}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setFormState({ mode: 'edit', expense })}
                        aria-label="Editar gasto"
                        className="rounded-lg p-1.5 text-faint transition-colors hover:bg-line hover:text-ink-soft"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(expense)}
                        aria-label="Eliminar gasto"
                        className="rounded-lg p-1.5 text-faint transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-faint">
                    No hay gastos cargados para este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ExpensesByTypeChart expenses={filteredExpenses} tipoCambio={tipoCambio} />
      </div>

      <FloatingActionButton icon={Plus} label="Cargar gasto" onClick={() => setFormState({ mode: 'create' })} />
      <ExpenseFormDrawer
        isOpen={formState !== null}
        onClose={() => setFormState(null)}
        onSubmit={handleSubmit}
        initialExpense={formState?.mode === 'edit' ? formState.expense : undefined}
      />
    </div>
  )
}

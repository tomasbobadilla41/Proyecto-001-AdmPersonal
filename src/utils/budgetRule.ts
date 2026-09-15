import type { Expense } from '../types/finance'
import { toARS } from './finance'

export interface BudgetRule503020 {
  /** 50% del ingreso: presupuesto ideal para gastos fijos. */
  fijos: number
  /** 30% del ingreso: presupuesto ideal para gastos flexibles. */
  flexibles: number
  /** 20% del ingreso: objetivo de ahorro/inversión. */
  ahorro: number
}

/** Reparte el Sueldo Total (en ARS) según la regla 50/30/20: Fijos / Flexibles / Ahorro (montos ideales). */
export function calculateBudgetRule(ingresosTotalesARS: number): BudgetRule503020 {
  return {
    fijos: ingresosTotalesARS * 0.5,
    flexibles: ingresosTotalesARS * 0.3,
    ahorro: ingresosTotalesARS * 0.2,
  }
}

export interface ActualBudgetSplit {
  /** Lo que realmente se gastó en el mes en categorías FIJO, en ARS. */
  fijosReal: number
  /** Lo que realmente se gastó en el mes en categorías FLEXIBLE, en ARS. */
  flexiblesReal: number
}

/** Suma los gastos reales de un mes, separados por `expenseType` (FIJO/FLEXIBLE), en ARS. */
export function calculateActualSplit(
  expenses: Expense[],
  mes: number,
  anio: number,
  tipoCambio: number,
): ActualBudgetSplit {
  let fijosReal = 0
  let flexiblesReal = 0

  for (const expense of expenses) {
    if (expense.fecha.getUTCMonth() + 1 !== mes || expense.fecha.getUTCFullYear() !== anio) continue
    const montoARS = toARS(expense.monto, expense.moneda, tipoCambio)
    if (expense.expenseType === 'FIJO') {
      fijosReal += montoARS
    } else {
      flexiblesReal += montoARS
    }
  }

  return { fijosReal, flexiblesReal }
}

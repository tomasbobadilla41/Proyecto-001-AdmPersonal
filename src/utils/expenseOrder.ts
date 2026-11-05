import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory } from '../types/finance'

/**
 * Posición de cada categoría según el orden canónico de `EXPENSE_CATEGORIES`
 * (primero las Fijas, después las Flexibles), así el listado respeta el mismo
 * orden que el formulario de carga.
 */
const CATEGORY_RANK = new Map<ExpenseCategory, number>(
  [...EXPENSE_CATEGORIES.FIJO, ...EXPENSE_CATEGORIES.FLEXIBLE].map((category, index) => [category, index]),
)

/**
 * Comparador para el listado de gastos: agrupa por categoría (orden canónico)
 * y dentro de cada categoría ordena por fecha descendente. El desempate final
 * por descripción hace el orden estable — sin él, los gastos del mismo día
 * quedaban en el orden arbitrario que devuelve Supabase.
 */
export function compareExpensesByCategoryThenDate(a: Expense, b: Expense): number {
  const rankA = CATEGORY_RANK.get(a.category) ?? Number.MAX_SAFE_INTEGER
  const rankB = CATEGORY_RANK.get(b.category) ?? Number.MAX_SAFE_INTEGER
  if (rankA !== rankB) return rankA - rankB

  const byDate = b.fecha.getTime() - a.fecha.getTime()
  if (byDate !== 0) return byDate

  return a.descripcion.localeCompare(b.descripcion, 'es')
}

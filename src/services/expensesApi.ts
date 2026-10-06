import { supabase } from '../lib/supabase'
import type { Expense, ExpenseCategory, ExpenseType } from '../types/finance'
import type { Currency } from '../types/money'
import { toDateOnlyUTC } from '../utils/finance'

interface ExpenseRow {
  id: string
  user_id: string
  amount: number
  type: ExpenseType
  category: ExpenseCategory
  date: string
  description: string
  currency: Currency
  subcategory: string | null
  recurring_group_id: string | null
}

function rowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    fecha: new Date(row.date),
    descripcion: row.description,
    monto: row.amount,
    moneda: row.currency,
    expenseType: row.type,
    category: row.category,
    subcategoria: row.subcategory ?? undefined,
    recurringGroupId: row.recurring_group_id ?? undefined,
  }
}

/** `Expense` sin `id`: Postgres lo genera en el insert (no lo mandamos nosotros). */
function expenseToInsertRow(expense: Expense, userId: string) {
  return {
    user_id: userId,
    amount: expense.monto,
    type: expense.expenseType,
    category: expense.category,
    date: toDateOnlyUTC(expense.fecha),
    description: expense.descripcion,
    currency: expense.moneda,
    subcategory: expense.subcategoria ?? null,
    recurring_group_id: expense.recurringGroupId ?? null,
  }
}

/** Gastos del usuario activo, del más nuevo al más viejo. */
export async function fetchExpenses(userId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (error) throw error
  return (data as ExpenseRow[]).map(rowToExpense)
}

/** Inserta uno o varios gastos (ej: una carga recurrente/en cuotas genera varios) en un solo request. */
export async function insertExpenses(expenses: Expense[], userId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expenses.map((expense) => expenseToInsertRow(expense, userId)))
    .select()

  if (error) throw error
  return (data as ExpenseRow[]).map(rowToExpense)
}

export async function updateExpenseRow(expense: Expense, userId: string): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .update(expenseToInsertRow(expense, userId))
    .eq('id', expense.id)
    .select()
    .single()

  if (error) throw error
  return rowToExpense(data as ExpenseRow)
}

export async function deleteExpenseRow(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

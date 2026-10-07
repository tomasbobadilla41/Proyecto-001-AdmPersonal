import { supabase } from '../lib/supabase'
import type { Income } from '../types/finance'

interface IncomeRow {
  id: string
  user_id: string
  month: number
  year: number
  salary_ars: number
  salary_usd: number
}

function rowToIncome(row: IncomeRow): Income {
  return {
    id: row.id,
    mes: row.month,
    anio: row.year,
    sueldoARS: row.salary_ars,
    sueldoUSD: row.salary_usd,
  }
}

export async function fetchIncomes(userId: string): Promise<Income[]> {
  const { data, error } = await supabase.from('incomes').select('*').eq('user_id', userId)
  if (error) throw error
  return (data as IncomeRow[]).map(rowToIncome)
}

/** Crea o reemplaza el ingreso de un mes/año (constraint `unique(user_id, month, year)` en la tabla). */
export async function upsertIncomeRow(income: Income, userId: string): Promise<Income> {
  const { data, error } = await supabase
    .from('incomes')
    .upsert(
      {
        user_id: userId,
        month: income.mes,
        year: income.anio,
        salary_ars: income.sueldoARS,
        salary_usd: income.sueldoUSD,
      },
      { onConflict: 'user_id,month,year' },
    )
    .select()
    .single()

  if (error) throw error
  return rowToIncome(data as IncomeRow)
}

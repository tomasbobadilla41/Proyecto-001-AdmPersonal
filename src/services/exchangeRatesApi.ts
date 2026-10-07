import { supabase } from '../lib/supabase'
import type { ExchangeRate } from '../types/finance'

interface ExchangeRateRow {
  id: string
  user_id: string
  month: number
  year: number
  rate: number
}

function rowToExchangeRate(row: ExchangeRateRow): ExchangeRate {
  return {
    id: row.id,
    mes: row.month,
    anio: row.year,
    valor: row.rate,
  }
}

export async function fetchExchangeRates(userId: string): Promise<ExchangeRate[]> {
  const { data, error } = await supabase.from('exchange_rates').select('*').eq('user_id', userId)
  if (error) throw error
  return (data as ExchangeRateRow[]).map(rowToExchangeRate)
}

/** Crea o reemplaza la cotización de un mes/año (constraint `unique(user_id, month, year)` en la tabla). */
export async function upsertExchangeRateRow(rate: ExchangeRate, userId: string): Promise<ExchangeRate> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .upsert(
      {
        user_id: userId,
        month: rate.mes,
        year: rate.anio,
        rate: rate.valor,
      },
      { onConflict: 'user_id,month,year' },
    )
    .select()
    .single()

  if (error) throw error
  return rowToExchangeRate(data as ExchangeRateRow)
}

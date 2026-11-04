import { supabase } from '../lib/supabase'
import type { ApplePayRequest } from '../types/applePay'

interface ApplePayRequestRow {
  id: string
  received_at: string
  status: number
  payload: unknown
  parsed_amount: number | string | null
  error: string | null
  expense_id: string | null
}

/** Trae las últimas llamadas del Shortcut (RLS limita a las del usuario). */
export async function fetchApplePayRequests(limit = 20): Promise<ApplePayRequest[]> {
  const { data, error } = await supabase
    .from('apple_pay_requests')
    .select('id, received_at, status, payload, parsed_amount, error, expense_id')
    .order('received_at', { ascending: false })
    .limit(limit)
  if (error) throw error

  return (data as ApplePayRequestRow[]).map((row) => ({
    id: row.id,
    receivedAt: row.received_at,
    status: row.status,
    payload: row.payload,
    // NUMERIC llega como string desde PostgREST en algunos casos.
    parsedAmount: row.parsed_amount === null ? null : { amount: Number(row.parsed_amount), currency: 'ARS' },
    error: row.error,
    expenseId: row.expense_id,
  }))
}

import { supabase } from '../lib/supabase'
import type { FixedExpenseCategory, ServiceConfig } from '../types/finance'

interface PaymentServiceRow {
  id: string
  user_id: string
  category: FixedExpenseCategory
  account_number: string
  payment_link: string
}

function rowToService(row: PaymentServiceRow): ServiceConfig {
  return {
    id: row.id,
    category: row.category,
    accountNumber: row.account_number,
    paymentLink: row.payment_link,
  }
}

/** `ServiceConfig` sin `id`: Postgres lo genera en el insert. */
function serviceToRow(service: ServiceConfig, userId: string) {
  return {
    user_id: userId,
    category: service.category,
    account_number: service.accountNumber,
    payment_link: service.paymentLink,
  }
}

export async function fetchServices(userId: string): Promise<ServiceConfig[]> {
  const { data, error } = await supabase.from('payment_services').select('*').eq('user_id', userId)
  if (error) throw error
  return (data as PaymentServiceRow[]).map(rowToService)
}

export async function insertService(service: ServiceConfig, userId: string): Promise<ServiceConfig> {
  const { data, error } = await supabase
    .from('payment_services')
    .insert(serviceToRow(service, userId))
    .select()
    .single()

  if (error) throw error
  return rowToService(data as PaymentServiceRow)
}

export async function updateServiceRow(service: ServiceConfig, userId: string): Promise<ServiceConfig> {
  const { data, error } = await supabase
    .from('payment_services')
    .update(serviceToRow(service, userId))
    .eq('id', service.id)
    .select()
    .single()

  if (error) throw error
  return rowToService(data as PaymentServiceRow)
}

export async function deleteServiceRow(id: string): Promise<void> {
  const { error } = await supabase.from('payment_services').delete().eq('id', id)
  if (error) throw error
}

import { supabase } from '../lib/supabase'
import type { FixedExpenseCategory, ServiceConfig } from '../types/finance'

interface ServiceRow {
  id: string
  user_id: string
  title: string
  category: FixedExpenseCategory
  account_number: string | null
  payment_link: string | null
  sender_email: string | null
  due_day: number | null
}

function rowToService(row: ServiceRow): ServiceConfig {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    accountNumber: row.account_number ?? undefined,
    paymentLink: row.payment_link ?? undefined,
    senderEmail: row.sender_email ?? undefined,
    dueDay: row.due_day ?? undefined,
  }
}

/** `ServiceConfig` sin `id`: Postgres lo genera en el insert. */
function serviceToRow(service: ServiceConfig, userId: string) {
  return {
    user_id: userId,
    title: service.title,
    category: service.category,
    account_number: service.accountNumber ?? null,
    payment_link: service.paymentLink ?? null,
    sender_email: service.senderEmail ?? null,
    due_day: service.dueDay ?? null,
  }
}

export async function fetchServices(userId: string): Promise<ServiceConfig[]> {
  const { data, error } = await supabase.from('services').select('*').eq('user_id', userId)
  if (error) throw error
  return (data as ServiceRow[]).map(rowToService)
}

export async function insertService(service: ServiceConfig, userId: string): Promise<ServiceConfig> {
  const { data, error } = await supabase
    .from('services')
    .insert(serviceToRow(service, userId))
    .select()
    .single()

  if (error) throw error
  return rowToService(data as ServiceRow)
}

export async function updateServiceRow(service: ServiceConfig, userId: string): Promise<ServiceConfig> {
  const { data, error } = await supabase
    .from('services')
    .update(serviceToRow(service, userId))
    .eq('id', service.id)
    .select()
    .single()

  if (error) throw error
  return rowToService(data as ServiceRow)
}

export async function deleteServiceRow(id: string): Promise<void> {
  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) throw error
}

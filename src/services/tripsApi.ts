import { supabase } from '../lib/supabase'
import type { Currency } from '../types/money'
import type { Trip, TripExpense, TripExpenseCategory, TripExpenseStatus, TripPaidBy } from '../types/trips'

// ============================================
// Trips
// ============================================

interface TripRow {
  id: string
  user_id: string
  name: string
  destination: string
  start_date: string
  end_date: string
  budget_amount: number | null
  budget_currency: Currency | null
  partner_name: string | null
}

function rowToTrip(row: TripRow): Trip {
  return {
    id: row.id,
    name: row.name,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    budget:
      row.budget_amount !== null && row.budget_currency !== null
        ? { amount: Number(row.budget_amount), currency: row.budget_currency }
        : undefined,
    partnerName: row.partner_name ?? undefined,
  }
}

function tripToRow(trip: Trip, userId: string) {
  return {
    user_id: userId,
    name: trip.name,
    destination: trip.destination,
    start_date: trip.startDate,
    end_date: trip.endDate,
    budget_amount: trip.budget?.amount ?? null,
    budget_currency: trip.budget?.currency ?? null,
    partner_name: trip.partnerName ?? null,
  }
}

/** Viajes del usuario, del más próximo/reciente al más viejo. */
export async function fetchTrips(userId: string): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false })
  if (error) throw error
  return (data as TripRow[]).map(rowToTrip)
}

export async function insertTrip(trip: Trip, userId: string): Promise<Trip> {
  const { data, error } = await supabase.from('trips').insert(tripToRow(trip, userId)).select().single()
  if (error) throw error
  return rowToTrip(data as TripRow)
}

export async function updateTripRow(trip: Trip, userId: string): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .update(tripToRow(trip, userId))
    .eq('id', trip.id)
    .select()
    .single()
  if (error) throw error
  return rowToTrip(data as TripRow)
}

/** Borra el viaje; Postgres cascadea a `trip_expenses` y de ahí a los `expenses` vinculados. */
export async function deleteTripRow(id: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', id)
  if (error) throw error
}

// ============================================
// Trip expenses
// ============================================

interface TripExpenseRow {
  id: string
  user_id: string
  trip_id: string
  category: TripExpenseCategory
  description: string
  amount: number
  currency: Currency
  payment_date: string
  status: TripExpenseStatus
  paid_by: TripPaidBy
  installments: number
  notes: string | null
}

function rowToTripExpense(row: TripExpenseRow): TripExpense {
  return {
    id: row.id,
    tripId: row.trip_id,
    category: row.category,
    description: row.description,
    // NUMERIC llega como string desde PostgREST según la config; se normaliza.
    amount: Number(row.amount),
    currency: row.currency,
    paymentDate: row.payment_date,
    status: row.status,
    paidBy: row.paid_by,
    installments: row.installments,
    notes: row.notes ?? undefined,
  }
}

function tripExpenseToRow(expense: TripExpense, userId: string) {
  return {
    user_id: userId,
    trip_id: expense.tripId,
    category: expense.category,
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    payment_date: expense.paymentDate,
    status: expense.status,
    paid_by: expense.paidBy,
    installments: expense.installments,
    notes: expense.notes ?? null,
  }
}

export async function fetchTripExpenses(userId: string): Promise<TripExpense[]> {
  const { data, error } = await supabase
    .from('trip_expenses')
    .select('*')
    .eq('user_id', userId)
    .order('payment_date', { ascending: true })
  if (error) throw error
  return (data as TripExpenseRow[]).map(rowToTripExpense)
}

export async function insertTripExpense(expense: TripExpense, userId: string): Promise<TripExpense> {
  const { data, error } = await supabase
    .from('trip_expenses')
    .insert(tripExpenseToRow(expense, userId))
    .select()
    .single()
  if (error) throw error
  return rowToTripExpense(data as TripExpenseRow)
}

export async function updateTripExpenseRow(expense: TripExpense, userId: string): Promise<TripExpense> {
  const { data, error } = await supabase
    .from('trip_expenses')
    .update(tripExpenseToRow(expense, userId))
    .eq('id', expense.id)
    .select()
    .single()
  if (error) throw error
  return rowToTripExpense(data as TripExpenseRow)
}

/** Borra el gasto del viaje; Postgres cascadea a los `expenses` vinculados. */
export async function deleteTripExpenseRow(id: string): Promise<void> {
  const { error } = await supabase.from('trip_expenses').delete().eq('id', id)
  if (error) throw error
}

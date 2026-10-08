import { supabase } from '../lib/supabase'
import type {
  LeaseContract,
  Property,
  PropertyExpense,
  PropertyExpenseStatus,
  PropertyIncome,
  PropertyServiceConfig,
  RentIndexType,
} from '../types/realEstate'
import type { Currency } from '../types/money'

// ============================================
// Properties
// ============================================

interface PropertyRow {
  id: string
  user_id: string
  name: string
  address: string
}

function rowToProperty(row: PropertyRow): Property {
  return { id: row.id, name: row.name, address: row.address }
}

function propertyToRow(property: Property, userId: string) {
  return { user_id: userId, name: property.name, address: property.address }
}

export async function fetchProperties(userId: string): Promise<Property[]> {
  const { data, error } = await supabase.from('properties').select('*').eq('user_id', userId)
  if (error) throw error
  return (data as PropertyRow[]).map(rowToProperty)
}

export async function insertProperty(property: Property, userId: string): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .insert(propertyToRow(property, userId))
    .select()
    .single()
  if (error) throw error
  return rowToProperty(data as PropertyRow)
}

export async function updatePropertyRow(property: Property, userId: string): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .update(propertyToRow(property, userId))
    .eq('id', property.id)
    .select()
    .single()
  if (error) throw error
  return rowToProperty(data as PropertyRow)
}

/** Borra la propiedad; Postgres cascadea (ON DELETE CASCADE) servicios, gastos, ingresos y contratos. */
export async function deletePropertyRow(id: string): Promise<void> {
  const { error } = await supabase.from('properties').delete().eq('id', id)
  if (error) throw error
}

// ============================================
// Property service configs
// ============================================

interface PropertyServiceConfigRow {
  id: string
  user_id: string
  property_id: string
  service_name: string
  account_number: string
  is_auto_debit: boolean
}

function rowToServiceConfig(row: PropertyServiceConfigRow): PropertyServiceConfig {
  return {
    id: row.id,
    propertyId: row.property_id,
    serviceName: row.service_name,
    accountNumber: row.account_number,
    isAutoDebit: row.is_auto_debit,
  }
}

function serviceConfigToRow(config: PropertyServiceConfig, userId: string) {
  return {
    user_id: userId,
    property_id: config.propertyId,
    service_name: config.serviceName,
    account_number: config.accountNumber,
    is_auto_debit: config.isAutoDebit,
  }
}

export async function fetchServiceConfigs(userId: string): Promise<PropertyServiceConfig[]> {
  const { data, error } = await supabase.from('property_service_configs').select('*').eq('user_id', userId)
  if (error) throw error
  return (data as PropertyServiceConfigRow[]).map(rowToServiceConfig)
}

export async function insertServiceConfig(
  config: PropertyServiceConfig,
  userId: string,
): Promise<PropertyServiceConfig> {
  const { data, error } = await supabase
    .from('property_service_configs')
    .insert(serviceConfigToRow(config, userId))
    .select()
    .single()
  if (error) throw error
  return rowToServiceConfig(data as PropertyServiceConfigRow)
}

export async function updateServiceConfigRow(
  config: PropertyServiceConfig,
  userId: string,
): Promise<PropertyServiceConfig> {
  const { data, error } = await supabase
    .from('property_service_configs')
    .update(serviceConfigToRow(config, userId))
    .eq('id', config.id)
    .select()
    .single()
  if (error) throw error
  return rowToServiceConfig(data as PropertyServiceConfigRow)
}

export async function deleteServiceConfigRow(id: string): Promise<void> {
  const { error } = await supabase.from('property_service_configs').delete().eq('id', id)
  if (error) throw error
}

// ============================================
// Property expenses
// ============================================

interface PropertyExpenseRow {
  id: string
  user_id: string
  property_id: string
  service_config_id: string | null
  service_name: string
  month: number
  year: number
  amount: number
  status: PropertyExpenseStatus
}

function rowToExpense(row: PropertyExpenseRow): PropertyExpense {
  return {
    id: row.id,
    propertyId: row.property_id,
    serviceConfigId: row.service_config_id,
    serviceName: row.service_name,
    month: row.month,
    year: row.year,
    amount: row.amount,
    status: row.status,
  }
}

function expenseToRow(expense: PropertyExpense, userId: string) {
  return {
    user_id: userId,
    property_id: expense.propertyId,
    service_config_id: expense.serviceConfigId,
    service_name: expense.serviceName,
    month: expense.month,
    year: expense.year,
    amount: expense.amount,
    status: expense.status,
  }
}

export async function fetchPropertyExpenses(userId: string): Promise<PropertyExpense[]> {
  const { data, error } = await supabase.from('property_expenses').select('*').eq('user_id', userId)
  if (error) throw error
  return (data as PropertyExpenseRow[]).map(rowToExpense)
}

export async function insertPropertyExpense(expense: PropertyExpense, userId: string): Promise<PropertyExpense> {
  const { data, error } = await supabase
    .from('property_expenses')
    .insert(expenseToRow(expense, userId))
    .select()
    .single()
  if (error) throw error
  return rowToExpense(data as PropertyExpenseRow)
}

export async function updatePropertyExpenseRow(expense: PropertyExpense, userId: string): Promise<PropertyExpense> {
  const { data, error } = await supabase
    .from('property_expenses')
    .update(expenseToRow(expense, userId))
    .eq('id', expense.id)
    .select()
    .single()
  if (error) throw error
  return rowToExpense(data as PropertyExpenseRow)
}

export async function deletePropertyExpenseRow(id: string): Promise<void> {
  const { error } = await supabase.from('property_expenses').delete().eq('id', id)
  if (error) throw error
}

// ============================================
// Property incomes
// ============================================

interface PropertyIncomeRow {
  id: string
  user_id: string
  property_id: string
  month: number
  year: number
  amount: number
  currency: Currency
}

function rowToIncome(row: PropertyIncomeRow): PropertyIncome {
  return {
    id: row.id,
    propertyId: row.property_id,
    month: row.month,
    year: row.year,
    amount: row.amount,
    currency: row.currency,
  }
}

function incomeToRow(income: PropertyIncome, userId: string) {
  return {
    user_id: userId,
    property_id: income.propertyId,
    month: income.month,
    year: income.year,
    amount: income.amount,
    currency: income.currency,
  }
}

export async function fetchPropertyIncomes(userId: string): Promise<PropertyIncome[]> {
  const { data, error } = await supabase.from('property_incomes').select('*').eq('user_id', userId)
  if (error) throw error
  return (data as PropertyIncomeRow[]).map(rowToIncome)
}

export async function insertPropertyIncome(income: PropertyIncome, userId: string): Promise<PropertyIncome> {
  const { data, error } = await supabase
    .from('property_incomes')
    .insert(incomeToRow(income, userId))
    .select()
    .single()
  if (error) throw error
  return rowToIncome(data as PropertyIncomeRow)
}

export async function updatePropertyIncomeRow(income: PropertyIncome, userId: string): Promise<PropertyIncome> {
  const { data, error } = await supabase
    .from('property_incomes')
    .update(incomeToRow(income, userId))
    .eq('id', income.id)
    .select()
    .single()
  if (error) throw error
  return rowToIncome(data as PropertyIncomeRow)
}

export async function deletePropertyIncomeRow(id: string): Promise<void> {
  const { error } = await supabase.from('property_incomes').delete().eq('id', id)
  if (error) throw error
}

// ============================================
// Lease contracts
// ============================================

interface LeaseContractRow {
  id: string
  user_id: string
  property_id: string
  tenant_name: string
  start_date: string
  end_date: string
  initial_rent_amount: number
  current_rent_amount: number
  update_frequency_months: number
  index_type: RentIndexType
  base_index_value: number | null
}

function rowToContract(row: LeaseContractRow): LeaseContract {
  return {
    id: row.id,
    propertyId: row.property_id,
    tenantName: row.tenant_name,
    startDate: row.start_date,
    endDate: row.end_date,
    initialRentAmount: row.initial_rent_amount,
    currentRentAmount: row.current_rent_amount,
    updateFrequencyMonths: row.update_frequency_months,
    indexType: row.index_type,
    baseIndexValue: row.base_index_value ?? undefined,
  }
}

function contractToRow(contract: LeaseContract, userId: string) {
  return {
    user_id: userId,
    property_id: contract.propertyId,
    tenant_name: contract.tenantName,
    start_date: contract.startDate,
    end_date: contract.endDate,
    initial_rent_amount: contract.initialRentAmount,
    current_rent_amount: contract.currentRentAmount,
    update_frequency_months: contract.updateFrequencyMonths,
    index_type: contract.indexType,
    base_index_value: contract.baseIndexValue ?? null,
  }
}

export async function fetchContracts(userId: string): Promise<LeaseContract[]> {
  const { data, error } = await supabase.from('lease_contracts').select('*').eq('user_id', userId)
  if (error) throw error
  return (data as LeaseContractRow[]).map(rowToContract)
}

export async function insertContract(contract: LeaseContract, userId: string): Promise<LeaseContract> {
  const { data, error } = await supabase
    .from('lease_contracts')
    .insert(contractToRow(contract, userId))
    .select()
    .single()
  if (error) throw error
  return rowToContract(data as LeaseContractRow)
}

export async function updateContractRow(contract: LeaseContract, userId: string): Promise<LeaseContract> {
  const { data, error } = await supabase
    .from('lease_contracts')
    .update(contractToRow(contract, userId))
    .eq('id', contract.id)
    .select()
    .single()
  if (error) throw error
  return rowToContract(data as LeaseContractRow)
}

export async function deleteContractRow(id: string): Promise<void> {
  const { error } = await supabase.from('lease_contracts').delete().eq('id', id)
  if (error) throw error
}

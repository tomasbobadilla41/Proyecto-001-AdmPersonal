import { supabase } from '../lib/supabase'
import type { PortfolioAssetType, PortfolioHolding } from '../types/finance'
import type { Currency } from '../types/money'

interface PortfolioHoldingRow {
  id: string
  user_id: string
  asset_type: PortfolioAssetType
  ticker: string
  amount_invested: number
  purchase_price: number
  quantity: number
  currency: Currency
  date: string
}

function rowToHolding(row: PortfolioHoldingRow): PortfolioHolding {
  return {
    id: row.id,
    assetType: row.asset_type,
    ticker: row.ticker,
    amountInvested: row.amount_invested,
    purchasePrice: row.purchase_price,
    quantity: row.quantity,
    currency: row.currency,
    date: row.date,
  }
}

/** `PortfolioHolding` sin `id`: Postgres lo genera en el insert. */
function holdingToInsertRow(holding: PortfolioHolding, userId: string) {
  return {
    user_id: userId,
    asset_type: holding.assetType,
    ticker: holding.ticker,
    amount_invested: holding.amountInvested,
    purchase_price: holding.purchasePrice,
    quantity: holding.quantity,
    currency: holding.currency,
    date: holding.date,
  }
}

export async function fetchHoldings(userId: string): Promise<PortfolioHolding[]> {
  const { data, error } = await supabase
    .from('portfolio_holdings')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (error) throw error
  return (data as PortfolioHoldingRow[]).map(rowToHolding)
}

export async function insertHolding(holding: PortfolioHolding, userId: string): Promise<PortfolioHolding> {
  const { data, error } = await supabase
    .from('portfolio_holdings')
    .insert(holdingToInsertRow(holding, userId))
    .select()
    .single()

  if (error) throw error
  return rowToHolding(data as PortfolioHoldingRow)
}

export async function deleteHoldingRow(id: string): Promise<void> {
  const { error } = await supabase.from('portfolio_holdings').delete().eq('id', id)
  if (error) throw error
}

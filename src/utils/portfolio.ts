import type { Currency } from '../types/money'
import type { PortfolioHolding } from '../types/finance'

/** Fracciones/nominales que compra `amountInvested` a `purchasePrice` (0 si el precio es inválido). */
export function calculateQuantity(amountInvested: number, purchasePrice: number): number {
  return purchasePrice > 0 ? amountInvested / purchasePrice : 0
}

/** Cantidad legible, sin ceros de más (hasta 8 decimales — precisión típica de cripto). */
export function formatQuantity(quantity: number): string {
  return quantity.toLocaleString('en-US', { maximumFractionDigits: 8 })
}

/** Ganancia/pérdida de una posición: monto (en su moneda) y porcentaje sobre lo invertido. */
export function getHoldingPnl(
  amountInvested: number,
  currentValue: number,
): { amount: number; percentage: number } {
  const amount = currentValue - amountInvested
  const percentage = amountInvested > 0 ? amount / amountInvested : 0
  return { amount, percentage }
}

/** Formatea un ratio de PnL (ej: 0.052) como "+5.20%" o "-2.10%", con signo explícito. */
export function formatPnlPercentage(ratio: number): string {
  const percent = ratio * 100
  const sign = percent >= 0 ? '+' : ''
  return `${sign}${percent.toFixed(2)}%`
}

/** Posición agregada de un ticker: suma todas sus compras y promedia el precio (PPC). */
export interface AggregatedPosition {
  ticker: string
  quantity: number
  /** Precio Promedio de Compra, ponderado por el monto invertido en cada compra. */
  averagePurchasePrice: number
  totalInvested: number
  currency: Currency
}

/**
 * Agrupa los registros de compra de `assetType` por ticker. El PPC de cada
 * posición es el costo total sobre la cantidad total — así una compra grande
 * a buen precio pesa más que una chica a mal precio.
 */
export function aggregateHoldingsByTicker(
  holdings: PortfolioHolding[],
  assetType: PortfolioHolding['assetType'],
): AggregatedPosition[] {
  const byTicker = new Map<string, { quantity: number; totalInvested: number; currency: Currency }>()

  for (const holding of holdings) {
    if (holding.assetType !== assetType) continue
    const prev = byTicker.get(holding.ticker) ?? { quantity: 0, totalInvested: 0, currency: holding.currency }
    byTicker.set(holding.ticker, {
      quantity: prev.quantity + holding.quantity,
      totalInvested: prev.totalInvested + holding.amountInvested,
      currency: holding.currency,
    })
  }

  return Array.from(byTicker.entries())
    .map(([ticker, { quantity, totalInvested, currency }]) => ({
      ticker,
      quantity,
      averagePurchasePrice: quantity > 0 ? totalInvested / quantity : 0,
      totalInvested,
      currency,
    }))
    .sort((a, b) => a.ticker.localeCompare(b.ticker))
}

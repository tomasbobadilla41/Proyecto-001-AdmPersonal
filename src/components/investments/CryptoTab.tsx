import { useState, type FormEvent } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { usePortfolioStore } from '../../hooks/usePortfolioStore'
import { useBinancePrices } from '../../hooks/useBinancePrices'
import { fetchBinancePrice } from '../../services/binanceApi'
import { formatMoney } from '../../utils/currency'
import { calculateQuantity, formatPnlPercentage, formatQuantity, getHoldingPnl } from '../../utils/portfolio'

export function CryptoTab() {
  const { holdings, addHolding, removeHolding } = usePortfolioStore()
  const [ticker, setTicker] = useState('')
  const [amountInvested, setAmountInvested] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const cryptoHoldings = holdings.filter((h) => h.assetType === 'crypto')
  const { prices: livePrices, isLoading: isLoadingPrices } = useBinancePrices(
    cryptoHoldings.map((h) => h.ticker),
  )

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const amount = Number(amountInvested) || 0
    const tickerLimpio = ticker.trim().toUpperCase()
    if (!tickerLimpio || amount <= 0 || isSubmitting) return

    setIsSubmitting(true)
    try {
      const purchasePrice = await fetchBinancePrice(tickerLimpio)

      addHolding({
        id: `crypto-${Date.now()}`,
        assetType: 'crypto',
        ticker: tickerLimpio,
        amountInvested: amount,
        purchasePrice,
        quantity: calculateQuantity(amount, purchasePrice),
        currency: 'USD',
        date: new Date().toISOString(),
      })

      setTicker('')
      setAmountInvested('')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No se pudo obtener el precio de Binance.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleDelete(id: string) {
    if (window.confirm('¿Eliminar este registro de compra?')) {
      removeHolding(id)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Registrar compra de criptomoneda</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="crypto-ticker">Moneda</Label>
              <Input
                id="crypto-ticker"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="BTC, ETH…"
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="crypto-amount">Capital invertido (USD)</Label>
              <Input
                id="crypto-amount"
                type="number"
                min="0"
                step="0.01"
                value={amountInvested}
                onChange={(e) => setAmountInvested(e.target.value)}
                placeholder="0.00"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="sm:col-span-3 flex items-center justify-between gap-3">
              <p className="text-xs text-faint">
                El precio de compra se toma en vivo desde Binance al registrar la compra.
              </p>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Registrar compra
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel/70 text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Moneda</th>
              <th className="px-4 py-3 text-right font-medium">Inversión Inicial (USD)</th>
              <th className="px-4 py-3 text-right font-medium">Valor Actual (USD)</th>
              <th className="px-4 py-3 text-right font-medium">Rendimiento</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {cryptoHoldings.map((holding) => {
              const livePrice = livePrices[holding.ticker]
              const currentValue = livePrice !== undefined ? holding.quantity * livePrice : null
              const pnl = currentValue !== null ? getHoldingPnl(holding.amountInvested, currentValue) : null
              const isPositive = pnl !== null && pnl.amount >= 0

              return (
                <tr key={holding.id} className="text-ink-soft">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">
                    {holding.ticker}
                    <p className="text-xs font-normal text-faint">{formatQuantity(holding.quantity)} fracciones</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatMoney({ amount: holding.amountInvested, currency: 'USD' })}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {currentValue !== null
                      ? formatMoney({ amount: currentValue, currency: 'USD' })
                      : isLoadingPrices
                        ? 'Cargando precios…'
                        : '—'}
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right font-medium ${
                      pnl === null ? 'text-faint' : isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {pnl !== null ? formatPnlPercentage(pnl.percentage) : isLoadingPrices ? '…' : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(holding.id)}
                      aria-label="Eliminar registro"
                      className="rounded-lg p-1.5 text-faint transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
            {cryptoHoldings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-faint">
                  Todavía no registraste ninguna compra de criptomonedas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

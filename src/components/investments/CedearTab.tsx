import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { CedearCombobox } from './CedearCombobox'
import { usePortfolioStore } from '../../hooks/usePortfolioStore'
import { formatMoney } from '../../utils/currency'
import { aggregateHoldingsByTicker, calculateQuantity, formatQuantity } from '../../utils/portfolio'

export function CedearTab() {
  const { holdings, isLoading, addHolding, removeHolding } = usePortfolioStore()
  const [ticker, setTicker] = useState('')
  const [quantity, setQuantity] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')

  const positions = aggregateHoldingsByTicker(holdings, 'cedear')

  const quantityNumber = Number(quantity) || 0
  const priceNumber = Number(purchasePrice) || 0
  const previewTotal = quantityNumber * priceNumber

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!ticker || quantityNumber <= 0 || priceNumber <= 0) return

    const saved = await addHolding({
      id: `cedear-${Date.now()}`,
      assetType: 'cedear',
      ticker,
      amountInvested: previewTotal,
      purchasePrice: priceNumber,
      quantity: calculateQuantity(previewTotal, priceNumber),
      currency: 'ARS',
      date: new Date().toISOString(),
    })

    if (saved) {
      setTicker('')
      setQuantity('')
      setPurchasePrice('')
    }
  }

  function handleDeletePosition(tickerToRemove: string) {
    if (!window.confirm(`¿Eliminar todas las compras de "${tickerToRemove}"?`)) return
    holdings
      .filter((h) => h.assetType === 'cedear' && h.ticker === tickerToRemove)
      .forEach((h) => void removeHolding(h.id))
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Registrar compra de CEDEAR</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5 sm:col-span-3">
              <Label>Buscador de CEDEAR</Label>
              <CedearCombobox value={ticker} onChange={setTicker} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cedear-quantity">Cantidad nominal</Label>
              <Input
                id="cedear-quantity"
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cedear-price">Precio de compra por CEDEAR</Label>
              <Input
                id="cedear-price"
                type="number"
                min="0"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Total invertido</Label>
              <p className="flex h-8 items-center text-sm font-semibold text-ink">
                {formatMoney({ amount: previewTotal, currency: 'ARS' })}
              </p>
            </div>

            <div className="sm:col-span-3 flex justify-end">
              <Button type="submit">Registrar compra</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel/70 text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Ticker</th>
              <th className="px-4 py-3 text-right font-medium">Cantidad</th>
              <th className="px-4 py-3 text-right font-medium">PPC</th>
              <th className="px-4 py-3 text-right font-medium">Total Invertido</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-faint">
                  Cargando inversiones…
                </td>
              </tr>
            )}
            {!isLoading && positions.map((position) => (
              <tr key={position.ticker} className="text-ink-soft">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">{position.ticker}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">{formatQuantity(position.quantity)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {formatMoney({ amount: position.averagePurchasePrice, currency: position.currency })}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {formatMoney({ amount: position.totalInvested, currency: position.currency })}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleDeletePosition(position.ticker)}
                    aria-label="Eliminar posición"
                    className="rounded-lg p-1.5 text-faint transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && positions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-faint">
                  Todavía no registraste ninguna compra de CEDEARs.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

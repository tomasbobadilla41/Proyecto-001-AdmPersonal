import { useMemo, useState, type FormEvent } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { PortfolioHolding } from '../../types/finance'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { FloatingActionButton } from '../common/FloatingActionButton'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { PositionList } from './PositionList'
import { PortfolioSummary } from './PortfolioSummary'
import { usePortfolioStore } from '../../hooks/usePortfolioStore'
import { useBinancePrices } from '../../hooks/useBinancePrices'
import { fetchBinancePrice } from '../../services/binanceApi'
import { formatMoney } from '../../utils/currency'
import { formatDateAR } from '../../utils/finance'
import {
  aggregateHoldingsByTicker,
  calculateQuantity,
  formatPnlPercentage,
  getHoldingPnl,
  type AggregatedPosition,
} from '../../utils/portfolio'

export function CryptoTab() {
  const { holdings, isLoading, addHolding, removeHolding } = usePortfolioStore()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [ticker, setTicker] = useState('')
  const [amountInvested, setAmountInvested] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [purchaseToDelete, setPurchaseToDelete] = useState<PortfolioHolding | null>(null)

  const positions = useMemo(() => aggregateHoldingsByTicker(holdings, 'crypto'), [holdings])
  const { prices: livePrices, isLoading: isLoadingPrices, error: pricesError } = useBinancePrices(positions.map((p) => p.ticker))

  /** Valor actual de una posición en USD, o `null` si Binance todavía no devolvió el precio. */
  function currentValueOf(position: AggregatedPosition): number | null {
    const livePrice = livePrices[position.ticker]
    return livePrice !== undefined ? position.quantity * livePrice : null
  }

  const totalInvested = positions.reduce((sum, p) => sum + p.totalInvested, 0)
  const currentValues = positions.map(currentValueOf)
  // Solo se muestra el total si están TODOS los precios — un total parcial
  // daría un rendimiento engañoso (faltaría el valor de alguna moneda).
  const hasAllPrices = positions.length > 0 && currentValues.every((v) => v !== null)
  const totalCurrent = hasAllPrices ? currentValues.reduce<number>((sum, v) => sum + (v ?? 0), 0) : null
  const totalPnl = totalCurrent !== null ? getHoldingPnl(totalInvested, totalCurrent) : null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const amount = Number(amountInvested) || 0
    const tickerLimpio = ticker.trim().toUpperCase()
    if (!tickerLimpio || amount <= 0 || isSubmitting) return

    setIsSubmitting(true)
    try {
      const purchasePrice = await fetchBinancePrice(tickerLimpio)

      const saved = await addHolding({
        id: `crypto-${Date.now()}`,
        assetType: 'crypto',
        ticker: tickerLimpio,
        amountInvested: amount,
        purchasePrice,
        quantity: calculateQuantity(amount, purchasePrice),
        currency: 'USD',
        date: new Date().toISOString(),
      })

      if (saved) {
        setTicker('')
        setAmountInvested('')
        setIsFormOpen(false)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo obtener el precio de Binance.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const pendingLabel = isLoadingPrices ? 'Cargando…' : '—'

  return (
    <div className="flex flex-col gap-4">
      {positions.length > 0 && (
        <PortfolioSummary
          metrics={[
            { label: 'Invertido', value: formatMoney({ amount: totalInvested, currency: 'USD' }) },
            {
              label: 'Valor actual',
              value: totalCurrent !== null ? formatMoney({ amount: totalCurrent, currency: 'USD' }) : pendingLabel,
              caption: pricesError && !hasAllPrices ? 'Falta el precio en vivo de alguna moneda' : 'En vivo desde Binance',
            },
            {
              label: 'Resultado',
              value: totalPnl ? formatMoney({ amount: totalPnl.amount, currency: 'USD' }) : pendingLabel,
              caption: totalPnl ? formatPnlPercentage(totalPnl.percentage) : undefined,
              valueClassName: totalPnl ? (totalPnl.amount >= 0 ? 'text-positive' : 'text-negative') : undefined,
            },
          ]}
        />
      )}

      <PositionList
        positions={positions}
        isLoading={isLoading}
        emptyMessage="Todavía no registraste ninguna compra de criptomonedas."
        onDeletePurchase={setPurchaseToDelete}
        renderValue={(position) => {
          const currentValue = currentValueOf(position)
          const pnl = currentValue !== null ? getHoldingPnl(position.totalInvested, currentValue) : null
          return (
            <>
              <p className="text-sm font-medium tabular-nums text-ink">
                {currentValue !== null ? formatMoney({ amount: currentValue, currency: 'USD' }) : pendingLabel}
              </p>
              <p
                className={`text-xs font-medium tabular-nums ${
                  pnl === null ? 'text-faint' : pnl.amount >= 0 ? 'text-positive' : 'text-negative'
                }`}
              >
                {pnl !== null ? formatPnlPercentage(pnl.percentage) : `de ${formatMoney({ amount: position.totalInvested, currency: 'USD' })}`}
              </p>
            </>
          )
        }}
      />

      <FloatingActionButton icon={Plus} label="Registrar compra" onClick={() => setIsFormOpen(true)} />

      <Dialog open={isFormOpen} onOpenChange={(open) => !isSubmitting && setIsFormOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar compra de cripto</DialogTitle>
            <DialogDescription>El precio de compra se toma en vivo desde Binance al confirmar.</DialogDescription>
          </DialogHeader>
          <form id="crypto-purchase-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="crypto-ticker">Moneda</Label>
              <Input
                id="crypto-ticker"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="BTC, ETH…"
                disabled={isSubmitting}
                autoFocus
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
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" form="crypto-purchase-form" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar compra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={purchaseToDelete !== null}
        title="¿Eliminar esta compra?"
        description={
          purchaseToDelete && (
            <>
              Compra de <span className="font-medium text-ink-soft">{purchaseToDelete.ticker}</span> por{' '}
              {formatMoney({ amount: purchaseToDelete.amountInvested, currency: purchaseToDelete.currency })} del{' '}
              {formatDateAR(new Date(purchaseToDelete.date))}. El resto de la posición no se toca.
            </>
          )
        }
        confirmLabel="Eliminar"
        destructive
        onCancel={() => setPurchaseToDelete(null)}
        onConfirm={() => {
          if (purchaseToDelete) void removeHolding(purchaseToDelete.id)
          setPurchaseToDelete(null)
        }}
      />
    </div>
  )
}

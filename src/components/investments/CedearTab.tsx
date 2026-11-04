import { useMemo, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import type { PortfolioHolding } from '../../types/finance'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { CedearCombobox } from './CedearCombobox'
import { PositionList } from './PositionList'
import { PortfolioSummary } from './PortfolioSummary'
import { FloatingActionButton } from '../common/FloatingActionButton'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { usePortfolioStore } from '../../hooks/usePortfolioStore'
import { formatMoney } from '../../utils/currency'
import { formatDateAR } from '../../utils/finance'
import { aggregateHoldingsByTicker, calculateQuantity } from '../../utils/portfolio'

export function CedearTab() {
  const { holdings, isLoading, addHolding, removeHolding } = usePortfolioStore()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [ticker, setTicker] = useState('')
  const [quantity, setQuantity] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseToDelete, setPurchaseToDelete] = useState<PortfolioHolding | null>(null)

  const positions = useMemo(() => aggregateHoldingsByTicker(holdings, 'cedear'), [holdings])
  const totalInvested = positions.reduce((sum, p) => sum + p.totalInvested, 0)

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
      setIsFormOpen(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {positions.length > 0 && (
        <PortfolioSummary
          metrics={[
            { label: 'Invertido', value: formatMoney({ amount: totalInvested, currency: 'ARS' }) },
            {
              label: 'Posiciones',
              value: positions.length,
              // Sin cotización en vivo de BYMA: por eso no hay valor actual ni rendimiento acá.
              caption: 'Sin cotización en vivo',
            },
          ]}
        />
      )}

      <PositionList
        positions={positions}
        isLoading={isLoading}
        emptyMessage="Todavía no registraste ninguna compra de CEDEARs."
        onDeletePurchase={setPurchaseToDelete}
        renderValue={(position) => (
          <>
            <p className="text-sm font-medium tabular-nums text-ink">
              {formatMoney({ amount: position.totalInvested, currency: position.currency })}
            </p>
            <p className="text-xs text-faint">invertido</p>
          </>
        )}
      />

      <FloatingActionButton icon={Plus} label="Registrar compra" onClick={() => setIsFormOpen(true)} />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar compra de CEDEAR</DialogTitle>
            <DialogDescription>Precio en pesos, como opera en BYMA.</DialogDescription>
          </DialogHeader>
          <form id="cedear-purchase-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>CEDEAR</Label>
              <CedearCombobox value={ticker} onChange={setTicker} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cedear-quantity">Cantidad</Label>
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
                <Label htmlFor="cedear-price">Precio por CEDEAR</Label>
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
            </div>
            <p className="flex items-baseline justify-between rounded-lg bg-line/50 px-3 py-2 text-sm">
              <span className="text-muted">Total invertido</span>
              <span className="font-semibold tabular-nums text-ink">
                {formatMoney({ amount: previewTotal, currency: 'ARS' })}
              </span>
            </p>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="cedear-purchase-form" disabled={!ticker}>
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

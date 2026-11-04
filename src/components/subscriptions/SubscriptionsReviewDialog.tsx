import { Loader2 } from 'lucide-react'
import type { ParsedSubscriptionRow } from '../../utils/parseSubscriptionsCsv'
import { formatMoney } from '../../utils/currency'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'

export interface ReviewItem extends ParsedSubscriptionRow {
  /** No está ni en los servicios precargados ni en los que ya agregaste a mano — se suma al catálogo de streaming. */
  isNew: boolean
  /** Ya existe un gasto de Streaming con este mismo nombre este mes — no es un bloqueo, solo un aviso. */
  alreadyLoadedThisMonth: boolean
  selected: boolean
}

interface SubscriptionsReviewDialogProps {
  /** `null` cierra el diálogo. */
  items: ReviewItem[] | null
  isConfirming: boolean
  onToggle: (index: number) => void
  onToggleAll: (selected: boolean) => void
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Revisión del CSV antes de guardar, en un diálogo (antes era una tarjeta al
 * final de la página que había que ir a buscar con scroll). Todas vienen
 * tildadas — ver el comentario en `SubscriptionsPage.buildReviewItems`.
 */
export function SubscriptionsReviewDialog({
  items,
  isConfirming,
  onToggle,
  onToggleAll,
  onCancel,
  onConfirm,
}: SubscriptionsReviewDialogProps) {
  const selected = items?.filter((item) => item.selected) ?? []
  const totalSelected = selected.reduce((sum, item) => sum + item.monto, 0)
  const allSelected = items !== null && selected.length === items.length

  return (
    <Dialog open={items !== null} onOpenChange={(open) => !open && !isConfirming && onCancel()}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Revisá antes de cargar</DialogTitle>
          <DialogDescription>
            Se van a cargar como gastos fijos de Streaming con fecha de hoy. Destildá las que no quieras cargar.
          </DialogDescription>
        </DialogHeader>

        {items && (
          <>
            <label className="flex items-center gap-3 px-1 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleAll(!allSelected)}
                className="h-4 w-4 accent-accent"
              />
              Seleccionar todas ({items.length})
            </label>

            <ul className="-mx-1 flex min-h-0 flex-col gap-1 overflow-y-auto px-1">
              {items.map((item, index) => (
                <li key={`${item.title}-${index}`}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-line/50">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => onToggle(index)}
                      className="h-4 w-4 shrink-0 accent-accent"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${item.selected ? 'text-ink' : 'text-faint'}`}>{item.title}</p>
                      {(item.isNew || item.alreadyLoadedThisMonth) && (
                        <div className="flex gap-2 text-xs">
                          {item.isNew && <span className="text-accent">Nueva</span>}
                          {item.alreadyLoadedThisMonth && <span className="text-warning">Ya cargada este mes</span>}
                        </div>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-sm tabular-nums ${item.selected ? 'font-medium text-ink' : 'text-faint line-through'}`}
                    >
                      {formatMoney({ amount: item.monto, currency: 'ARS' })}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}

        <DialogFooter className="items-center sm:justify-between">
          <p className="text-sm text-muted">
            {selected.length} seleccionadas ·{' '}
            <span className="font-semibold tabular-nums text-ink">
              {formatMoney({ amount: totalSelected, currency: 'ARS' })}
            </span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={isConfirming}>
              Cancelar
            </Button>
            <Button onClick={onConfirm} disabled={isConfirming || selected.length === 0}>
              {isConfirming && <Loader2 className="h-4 w-4 animate-spin" />}
              {isConfirming ? 'Cargando…' : `Cargar ${selected.length}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

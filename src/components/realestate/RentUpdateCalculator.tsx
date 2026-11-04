import { useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import type { RentIndexType } from '../../types/realEstate'
import { formatMoney } from '../../utils/currency'
import { calculateRentUpdate } from '../../utils/leaseContract'
import { useLatestIpc } from '../../hooks/useLatestIpc'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'

interface RentUpdateCalculatorProps {
  isOpen: boolean
  onClose: () => void
  /** Monto vigente antes de esta actualización. */
  currentAmount: number
  indexType: RentIndexType
  /** Sugerencia inicial para "Índice Base" (ej: el valor de índice al firmar, útil en la primera actualización). */
  initialBaseIndexValue?: number
  /** Se llama con el nuevo monto al confirmar "Aplicar Nuevo Monto". */
  onApply: (newAmount: number) => void
}

const INPUT_CLASSNAME =
  'w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none'

export function RentUpdateCalculator({
  isOpen,
  onClose,
  currentAmount,
  indexType,
  initialBaseIndexValue,
  onApply,
}: RentUpdateCalculatorProps) {
  const [baseIndex, setBaseIndex] = useState('')
  const [currentIndex, setCurrentIndex] = useState('')
  const { isLoading, error, refresh } = useLatestIpc()

  // Recarga los campos cada vez que se abre la calculadora.
  useEffect(() => {
    if (!isOpen) return
    setBaseIndex(initialBaseIndexValue ? String(initialBaseIndexValue) : '')
    setCurrentIndex('')
  }, [isOpen, initialBaseIndexValue])


  const newAmount = calculateRentUpdate(currentAmount, Number(baseIndex), Number(currentIndex))

  async function handleFetchIpc() {
    const result = await refresh()
    // Nunca rompe la app si falla: el input sigue editable a mano (ver `error` abajo).
    if (result) setCurrentIndex(String(result.value))
  }

  function handleApply() {
    if (!newAmount || newAmount <= 0) return
    onApply(newAmount)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Calculadora de Actualización</DialogTitle>
        </DialogHeader>

        <div>
          <p className="text-xs text-faint">Monto Actual</p>
          <p className="text-lg font-medium text-ink">
            {formatMoney({ amount: currentAmount, currency: 'ARS' })}
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          Índice Base (mes anterior al inicio/último aumento)
          <input
            type="number"
            min="0"
            step="0.01"
            value={baseIndex}
            onChange={(e) => setBaseIndex(e.target.value)}
            placeholder="Ej: 1234.56"
            className={INPUT_CLASSNAME}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          Índice Actual (mes actual)
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={currentIndex}
              onChange={(e) => setCurrentIndex(e.target.value)}
              placeholder="Ej: 1300.10"
              className={INPUT_CLASSNAME}
            />
            {indexType === 'IPC' && (
              <button
                type="button"
                onClick={handleFetchIpc}
                disabled={isLoading}
                aria-label="Buscar último IPC publicado (INDEC, datos.gob.ar)"
                title="Buscar último IPC publicado (INDEC, datos.gob.ar)"
                className="shrink-0 rounded-lg border border-line bg-app p-2 text-muted transition-colors hover:border-accent/50 hover:text-accent-text disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </button>
            )}
          </div>
          {error && <span className="text-xs text-negative">{error}</span>}
        </label>

        <div className="rounded-xl border border-line bg-app p-4 text-center">
          <p className="text-xs text-faint">Nuevo Monto Calculado</p>
          <p className="text-3xl font-semibold text-positive">
            {newAmount !== null ? formatMoney({ amount: newAmount, currency: 'ARS' }) : '—'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleApply}
            disabled={!newAmount}
            className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            Aplicar Nuevo Monto
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-4 py-2 text-sm text-muted transition-colors hover:bg-line"
          >
            Cancelar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

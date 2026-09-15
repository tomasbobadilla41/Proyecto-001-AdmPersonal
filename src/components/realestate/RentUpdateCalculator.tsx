import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, X } from 'lucide-react'
import type { RentIndexType } from '../../types/realEstate'
import { formatMoney } from '../../utils/currency'
import { calculateRentUpdate } from '../../utils/leaseContract'
import { useLatestIpc } from '../../hooks/useLatestIpc'

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
  'w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none'

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

  if (!isOpen) return null

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Calculadora de Actualización</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <p className="text-xs text-slate-500">Monto Actual</p>
          <p className="text-lg font-medium text-slate-100">
            {formatMoney({ amount: currentAmount, currency: 'ARS' })}
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm text-slate-300">
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

        <label className="flex flex-col gap-1 text-sm text-slate-300">
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
                className="shrink-0 rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-400 transition-colors hover:border-emerald-500/50 hover:text-emerald-400 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </button>
            )}
          </div>
          {error && <span className="text-xs text-rose-400">{error}</span>}
        </label>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-center">
          <p className="text-xs text-slate-500">Nuevo Monto Calculado</p>
          <p className="text-3xl font-semibold text-emerald-400">
            {newAmount !== null ? formatMoney({ amount: newAmount, currency: 'ARS' }) : '—'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleApply}
            disabled={!newAmount}
            className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Aplicar Nuevo Monto
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-800 px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

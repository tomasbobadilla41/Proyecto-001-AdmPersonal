import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { InvestmentPosition, InvestmentType } from '../../types/finance'
import type { Currency } from '../../types/money'
import { ALL_INVESTMENT_TYPES } from '../../utils/investments'

interface InvestmentFormDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (position: InvestmentPosition) => void
  /** Si se pasa, el formulario edita esa posición; si no, registra una compra nueva. */
  initialPosition?: InvestmentPosition
}

const INPUT_CLASSNAME =
  'w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none'

export function InvestmentFormDrawer({ isOpen, onClose, onSubmit, initialPosition }: InvestmentFormDrawerProps) {
  const isEditMode = Boolean(initialPosition)

  const [ticker, setTicker] = useState('')
  const [tipo, setTipo] = useState<InvestmentType>(ALL_INVESTMENT_TYPES[0])
  const [moneda, setMoneda] = useState<Currency>('ARS')
  const [cantidad, setCantidad] = useState('')
  const [precioCompra, setPrecioCompra] = useState('')
  const [precioActual, setPrecioActual] = useState('')

  // Recarga los campos cada vez que se abre el panel (registrando o editando).
  useEffect(() => {
    if (!isOpen) return
    if (initialPosition) {
      setTicker(initialPosition.ticker)
      setTipo(initialPosition.tipo)
      setMoneda(initialPosition.moneda)
      setCantidad(String(initialPosition.cantidad))
      setPrecioCompra(String(initialPosition.precioCompraPromedio))
      setPrecioActual(String(initialPosition.precioActual))
    } else {
      setTicker('')
      setTipo(ALL_INVESTMENT_TYPES[0])
      setMoneda('ARS')
      setCantidad('')
      setPrecioCompra('')
      setPrecioActual('')
    }
  }, [isOpen, initialPosition])

  if (!isOpen) return null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const cantidadNumerica = Number(cantidad)
    const precioCompraNumerico = Number(precioCompra)
    if (!ticker.trim() || !cantidadNumerica || cantidadNumerica <= 0 || !precioCompraNumerico || precioCompraNumerico <= 0) {
      return
    }
    // Al crear, el precio actual arranca igual al de compra (rendimiento 0%);
    // al editar, se puede haber tocado el campo de Precio Actual.
    const precioActualNumerico = isEditMode ? Number(precioActual) || precioCompraNumerico : precioCompraNumerico

    onSubmit({
      id: initialPosition?.id ?? `inv-${Date.now()}`,
      ticker: ticker.trim().toUpperCase(),
      tipo,
      cantidad: cantidadNumerica,
      precioCompraPromedio: precioCompraNumerico,
      precioActual: precioActualNumerico,
      moneda,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="flex h-full w-full max-w-sm flex-col gap-6 overflow-y-auto border-l border-line bg-panel p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">
            {isEditMode ? 'Editar posición' : 'Registrar compra'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-muted hover:bg-line hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Ticker
            <input
              type="text"
              required
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="Ej: AAPL"
              className={INPUT_CLASSNAME}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Tipo
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as InvestmentType)}
              className={INPUT_CLASSNAME}
            >
              {ALL_INVESTMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Moneda
            <select
              value={moneda}
              onChange={(e) => setMoneda(e.target.value as Currency)}
              className={INPUT_CLASSNAME}
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Cantidad
            <input
              type="number"
              min="0"
              step="any"
              required
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="0"
              className={INPUT_CLASSNAME}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Precio de compra (PPP)
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={precioCompra}
              onChange={(e) => setPrecioCompra(e.target.value)}
              placeholder="0.00"
              className={INPUT_CLASSNAME}
            />
          </label>

          {isEditMode ? (
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              Precio actual
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={precioActual}
                onChange={(e) => setPrecioActual(e.target.value)}
                placeholder="0.00"
                className={INPUT_CLASSNAME}
              />
            </label>
          ) : (
            <p className="-mt-2 text-xs text-faint">
              El precio actual arranca igual al de compra; más adelante vas a poder actualizarlo editando la posición.
            </p>
          )}

          <button
            type="submit"
            className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong"
          >
            {isEditMode ? 'Guardar cambios' : 'Guardar posición'}
          </button>
        </form>
      </div>
    </div>
  )
}

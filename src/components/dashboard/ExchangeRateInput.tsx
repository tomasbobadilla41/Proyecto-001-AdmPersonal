import { useEffect, useState, type FormEvent } from 'react'
import { DollarSign, Loader2, Pencil, RefreshCw } from 'lucide-react'
import { useDolarOficial } from '../../hooks/useDolarOficial'
import { MESES_CORTOS } from '../../utils/finance'

interface ExchangeRateInputProps {
  mes: number
  anio: number
  valor: number
  onSave: (valor: number) => void
}

/** Input compacto para setear la cotización del dólar del mes que se está mirando. */
export function ExchangeRateInput({ mes, anio, valor, onSave }: ExchangeRateInputProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const { isLoading, error, refresh } = useDolarOficial()

  function startEditing() {
    setDraft(String(valor))
    setIsEditing(true)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const numero = Number(draft)
    if (numero > 0) onSave(numero)
    setIsEditing(false)
  }

  async function handleRefresh() {
    const venta = await refresh()
    if (venta !== null) onSave(venta)
  }

  // Al cargar la página, consulta la cotización oficial automáticamente —
  // ya no hace falta tocar el botón de refrescar para tener el valor del día.
  // Se ejecuta una sola vez por montaje (al abrir/recargar la app); si falla
  // (sin internet, API caída), no rompe nada: el valor cargado sigue como
  // estaba y el usuario siempre puede editarlo a mano con el lápiz.
  useEffect(() => {
    handleRefresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isEditing) {
    return (
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-panel px-3 py-2"
      >
        <DollarSign className="h-4 w-4 shrink-0 text-emerald-400" />
        <span className="text-sm text-muted">Dólar {MESES_CORTOS[mes - 1]}:</span>
        <input
          type="number"
          min="0"
          step="0.01"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-24 bg-transparent text-sm font-semibold text-ink focus:outline-none"
        />
        <button type="submit" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
          Guardar
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="text-xs text-faint hover:text-ink-soft"
        >
          Cancelar
        </button>
      </form>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={startEditing}
          className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink-soft transition-colors hover:border-emerald-500/50 hover:text-ink"
        >
          <DollarSign className="h-4 w-4 text-emerald-400" />
          Dólar {MESES_CORTOS[mes - 1]} {anio}:
          <span className="font-semibold text-ink">${valor.toLocaleString('es-AR')}</span>
          <Pencil className="h-3.5 w-3.5 text-faint" />
        </button>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          aria-label="Actualizar desde dolarapi.com (oficial, venta)"
          title="Actualizar desde dolarapi.com (oficial, venta)"
          className="rounded-lg border border-line bg-panel p-2 text-muted transition-colors hover:border-emerald-500/50 hover:text-emerald-400 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </div>
      {error && <span className="text-xs text-rose-400">{error}</span>}
    </div>
  )
}

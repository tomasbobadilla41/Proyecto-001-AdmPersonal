import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { Expense } from '../types/finance'
import { useExpenseStore } from '../hooks/useExpenseStore'
import { useStreamingServicesStore } from '../hooks/useStreamingServicesStore'
import { DEFAULT_STREAMING_SERVICES } from '../utils/streamingServices'
import { parseSubscriptionsCsv, type ParsedSubscriptionRow } from '../utils/parseSubscriptionsCsv'
import { todayISODate } from '../utils/finance'

/** Mismo literal que usa `ExpenseFormDrawer` para la categoría de streaming — no está centralizado en finance.ts, se repite acá. */
const STREAMING_CATEGORY = 'Streaming (Netflix, YT)' as const

interface ReviewItem extends ParsedSubscriptionRow {
  /** No está ni en los servicios precargados ni en los que ya agregaste a mano — hay que sumarlo al catálogo de streaming. */
  isNew: boolean
  /** Ya existe un gasto de Streaming con este mismo nombre este mes — no es un bloqueo, solo un aviso. */
  alreadyLoadedThisMonth: boolean
  selected: boolean
}

/**
 * Suscripciones (streaming, música, etc.) importadas del CSV de
 * impuestito.com — separado del Centro de Pagos a propósito: estas no se
 * pagan por factura (débito automático) y no viven en el mismo catálogo. El
 * catálogo de nombres de servicio es el mismo que ya usa el selector de
 * streaming en la carga manual de gastos (`custom_streaming_services`).
 */
export function SubscriptionsPage() {
  const { expenses, addExpenses } = useExpenseStore()
  const { customStreamingServices, addStreamingService } = useStreamingServicesStore()

  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [reviewItems, setReviewItems] = useState<ReviewItem[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function buildReviewItems(rows: ParsedSubscriptionRow[]): ReviewItem[] {
    const knownServices = new Set([...DEFAULT_STREAMING_SERVICES, ...customStreamingServices])
    const now = new Date()
    const mes = now.getMonth()
    const anio = now.getFullYear()

    return rows.map((row) => {
      const alreadyLoadedThisMonth = expenses.some(
        (e) =>
          e.category === STREAMING_CATEGORY &&
          e.subcategoria === row.title &&
          e.fecha.getUTCMonth() === mes &&
          e.fecha.getUTCFullYear() === anio,
      )
      return {
        ...row,
        isNew: !knownServices.has(row.title),
        alreadyLoadedThisMonth,
        // Pre-tildadas las que no se cargaron este mes todavía; las que sí, se dejan destildadas (el usuario las prende si quiere repetir igual).
        selected: !alreadyLoadedThisMonth,
      }
    })
  }

  async function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('El archivo debe ser un .csv.')
      return
    }

    setIsProcessing(true)
    try {
      const rows = await parseSubscriptionsCsv(file)
      if (rows.length === 0) {
        toast.error('No se encontraron suscripciones en el archivo — revisá que sea el CSV de impuestito.com.')
        return
      }
      setReviewItems(buildReviewItems(rows))
    } catch {
      toast.error('No se pudo leer el archivo CSV.')
    } finally {
      setIsProcessing(false)
    }
  }

  function toggleItem(index: number) {
    setReviewItems((prev) => prev?.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item)) ?? null)
  }

  async function handleConfirm() {
    if (!reviewItems) return
    const selected = reviewItems.filter((item) => item.selected)
    if (selected.length === 0) {
      toast.error('No seleccionaste ninguna suscripción para cargar.')
      return
    }

    setIsConfirming(true)
    try {
      for (const item of selected) {
        if (item.isNew) {
          await addStreamingService(item.title)
        }
      }

      const batchTimestamp = Date.now()
      const newExpenses: Expense[] = selected.map((item, index) => ({
        id: `exp-${batchTimestamp}-${index}`,
        fecha: new Date(todayISODate()),
        descripcion: item.title,
        monto: item.monto,
        moneda: 'ARS',
        expenseType: 'FIJO',
        category: STREAMING_CATEGORY,
        subcategoria: item.title,
      }))

      const saved = await addExpenses(newExpenses)
      if (!saved) return // el store ya mostró su propio toast de error

      toast.success(`Se cargaron ${selected.length} suscripción(es).`)
      setReviewItems(null)
    } finally {
      setIsConfirming(false)
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void processFile(file)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void processFile(file)
  }

  const totalSelected = reviewItems?.filter((item) => item.selected).reduce((sum, item) => sum + item.monto, 0) ?? 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-ink">Suscripciones</h2>
        <p className="text-sm text-muted">
          Importá el CSV de suscripciones de impuestito.com para actualizar mes a mes lo que gastás en streaming.
        </p>
      </div>

      <div
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`mx-auto flex w-full max-w-3xl cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          isDragging ? 'border-accent bg-accent/5' : 'border-line hover:border-line-strong'
        }`}
      >
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />

        {isProcessing ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="text-sm font-medium text-ink-soft">Leyendo CSV…</p>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6 text-faint" />
            <p className="text-sm font-medium text-ink-soft">Arrastrá acá el CSV de suscripciones de impuestito.com</p>
            <p className="text-xs text-faint">o hacé clic para elegir un archivo</p>
          </>
        )}
      </div>

      {reviewItems && (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-line bg-panel p-5">
          <h3 className="text-sm font-semibold text-ink">Revisá antes de confirmar</h3>

          <div className="flex flex-col gap-2">
            {reviewItems.map((item, index) => (
              <label
                key={`${item.title}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-app px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleItem(index)}
                    className="h-4 w-4 rounded border-line-strong bg-app text-accent focus:ring-accent"
                  />
                  <div>
                    <p className="text-sm font-medium text-ink">{item.title}</p>
                    <div className="flex gap-2 text-xs">
                      {item.isNew && <span className="text-accent">Nueva</span>}
                      {item.alreadyLoadedThisMonth && <span className="text-orange-400">Ya cargada este mes</span>}
                    </div>
                  </div>
                </div>
                <p className="text-sm font-medium text-ink">${item.monto.toFixed(2)}</p>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-line pt-3">
            <p className="text-sm text-muted">
              Total seleccionado: <span className="font-semibold text-ink">${totalSelected.toFixed(2)}</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReviewItems(null)}
                className="rounded-lg border border-line-strong px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-line"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isConfirming}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong disabled:opacity-50"
              >
                {isConfirming ? 'Cargando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import type { Expense } from '../types/finance'
import { useExpenseStore } from '../hooks/useExpenseStore'
import { useExchangeRateStore } from '../hooks/useExchangeRateStore'
import { useStreamingServicesStore } from '../hooks/useStreamingServicesStore'
import { DEFAULT_STREAMING_SERVICES } from '../utils/streamingServices'
import { parseSubscriptionsCsv, type ParsedSubscriptionRow } from '../utils/parseSubscriptionsCsv'
import { getExchangeRate, todayISODate } from '../utils/finance'
import { classifySubscriptions, STREAMING_CATEGORY } from '../utils/subscriptions'
import { FileDropBar } from '../components/common/FileDropBar'
import { Skeleton } from '../components/common/Skeleton'
import { SubscriptionsSummary } from '../components/subscriptions/SubscriptionsSummary'
import { SubscriptionList } from '../components/subscriptions/SubscriptionList'
import { SubscriptionsReviewDialog, type ReviewItem } from '../components/subscriptions/SubscriptionsReviewDialog'

/**
 * Suscripciones (streaming, música, etc.) importadas del CSV de
 * impuestito.com — separado del Centro de Pagos a propósito: estas no se
 * pagan por factura (débito automático) y no viven en el mismo catálogo. El
 * catálogo de nombres de servicio es el mismo que ya usa el selector de
 * streaming en la carga manual de gastos (`custom_streaming_services`).
 */
export function SubscriptionsPage() {
  const { expenses, isLoading, addExpenses } = useExpenseStore()
  const { exchangeRates } = useExchangeRateStore()
  const { customStreamingServices, addStreamingService } = useStreamingServicesStore()

  const [isProcessing, setIsProcessing] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [reviewItems, setReviewItems] = useState<ReviewItem[] | null>(null)

  const { active, inactive } = useMemo(() => classifySubscriptions(expenses), [expenses])
  const now = new Date()
  const tipoCambio = getExchangeRate(exchangeRates, now.getMonth() + 1, now.getFullYear())

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
        // Siempre pre-tildada, incluso si ya se cargó este mes — el CSV de
        // impuestito.com trae todas las suscripciones activas cada vez (viejas
        // y nuevas), así que destildar las "ya cargadas" por defecto las
        // excluía en silencio: si el usuario no notaba el checkbox vacío,
        // "Confirmar" solo guardaba las nuevas. "Ya cargada este mes" queda
        // como lo que el comentario original decía que era — un aviso, no un
        // bloqueo — y el usuario destilda a mano si de verdad no quiere repetirla.
        selected: true,
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

  function toggleAll(selected: boolean) {
    setReviewItems((prev) => prev?.map((item) => ({ ...item, selected })) ?? null)
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

  const hasSubscriptions = active.length > 0 || inactive.length > 0

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <h2 className="text-2xl font-semibold tracking-tight text-ink">Suscripciones</h2>

      {isLoading ? (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando suscripciones">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : hasSubscriptions ? (
        <>
          {active.length > 0 && <SubscriptionsSummary active={active} tipoCambio={tipoCambio} />}
          <FileDropBar
            accept=".csv"
            onFile={(file) => void processFile(file)}
            isProcessing={isProcessing}
            title="Importá el CSV del mes"
            hint="de impuestito.com — arrastralo acá o hacé clic."
            processingLabel="Leyendo CSV…"
            icon={FileSpreadsheet}
            ariaLabel="Importar el CSV de suscripciones de impuestito.com"
          />
          <SubscriptionList active={active} inactive={inactive} tipoCambio={tipoCambio} />
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Importá el CSV de suscripciones de impuestito.com para llevar mes a mes lo que gastás en streaming.
          </p>
          <FileDropBar
            variant="hero"
            accept=".csv"
            onFile={(file) => void processFile(file)}
            isProcessing={isProcessing}
            title="Arrastrá acá el CSV de impuestito.com"
            hint="o hacé clic para elegir el archivo"
            processingLabel="Leyendo CSV…"
            icon={FileSpreadsheet}
            ariaLabel="Importar el CSV de suscripciones de impuestito.com"
          />
        </div>
      )}

      <SubscriptionsReviewDialog
        items={reviewItems}
        isConfirming={isConfirming}
        onToggle={toggleItem}
        onToggleAll={toggleAll}
        onCancel={() => setReviewItems(null)}
        onConfirm={() => void handleConfirm()}
      />
    </div>
  )
}

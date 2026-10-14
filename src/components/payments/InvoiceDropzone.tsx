import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { FileText, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { EXPENSE_CATEGORIES, type FixedExpenseCategory, type ServiceConfig } from '../../types/finance'
import { onlyDigits, parseInvoicePdf } from '../../services/parseInvoiceApi'

interface InvoiceDropzoneProps {
  services: ServiceConfig[]
  /** Se llama cuando la IA leyó la factura y matcheó un servicio existente (por `account_number`, o por categoría si es la única de ese tipo). */
  onMatch: (service: ServiceConfig, montoDetectado: number) => void
  /** Se llama cuando no matcheó ningún servicio existente — para precargar el alta de uno nuevo. */
  onNoMatch: (sugerencia: { accountNumber: string; category?: FixedExpenseCategory; montoDetectado: number }) => void
}

function isFixedExpenseCategory(value: string): value is FixedExpenseCategory {
  return (EXPENSE_CATEGORIES.FIJO as readonly string[]).includes(value)
}

/**
 * Zona de "arrastrá tu factura acá" del Centro de Pagos: lee el PDF con
 * Gemini (vía la Edge Function `parse-invoice`) y busca un servicio que
 * matchee — primero por `account_number` (normalizado a solo dígitos), y si
 * no hay match, por categoría sugerida (solo si hay un único servicio de esa
 * categoría en el catálogo, para no adivinar con ambigüedad). Si matchea,
 * dispara `onMatch` para abrir "Registrar Pago" con el monto precargado; si
 * no, `onNoMatch` para precargar el alta de un servicio nuevo.
 */
export function InvoiceDropzone({ services, onMatch, onNoMatch }: InvoiceDropzoneProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function processPdf(file: File) {
    setIsProcessing(true)
    try {
      const data = await parseInvoicePdf(file)

      if (data.source === 'regex') {
        toast.info('Gemini no respondió — se usaron los datos leídos sin IA. Revisalos antes de confirmar.')
      }

      const numeroCliente = onlyDigits(data.numero_cliente ?? '')
      const category = isFixedExpenseCategory(data.categoria_sugerida) ? data.categoria_sugerida : undefined

      let match = numeroCliente
        ? services.find((s) => s.accountNumber && onlyDigits(s.accountNumber) === numeroCliente)
        : undefined

      if (!match && category) {
        // Fallback sin ambigüedad: solo si hay exactamente un servicio de esa categoría.
        const sameCategory = services.filter((s) => s.category === category)
        if (sameCategory.length === 1) match = sameCategory[0]
      }

      if (!match) {
        toast.info('No encontramos el servicio — completá los datos para crear uno nuevo.')
        onNoMatch({ accountNumber: data.numero_cliente ?? '', category, montoDetectado: data.monto_total })
        return
      }

      onMatch(match, data.monto_total)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al leer factura. Probá de nuevo en unos segundos.')
    } finally {
      setIsProcessing(false)
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDraggingOver(false)
    const file = event.dataTransfer.files[0]
    if (file) void processPdf(file)
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) void processPdf(file)
    event.target.value = ''
  }

  return (
    <div
      onClick={() => !isProcessing && fileInputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDraggingOver(true)
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className={`mx-auto flex w-full max-w-3xl cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
        isDraggingOver ? 'border-accent bg-accent/5' : 'border-line hover:border-line-strong'
      }`}
    >
      <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileInputChange} />

      {isProcessing ? (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <p className="text-sm font-medium text-ink-soft">IA analizando factura…</p>
        </>
      ) : (
        <>
          {isDraggingOver ? (
            <FileText className="h-6 w-6 text-accent" />
          ) : (
            <Sparkles className="h-6 w-6 text-faint" />
          )}
          <p className="text-sm font-medium text-ink-soft">Arrastrá tu factura en PDF acá para extraer los datos con IA</p>
          <p className="text-xs text-faint">o hacé clic para elegir un archivo</p>
        </>
      )}
    </div>
  )
}

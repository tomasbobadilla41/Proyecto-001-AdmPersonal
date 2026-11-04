import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { FileText, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { isFixedExpenseCategory, type FixedExpenseCategory, type ServiceConfig } from '../../types/finance'
import { onlyDigits, parseInvoicePdf } from '../../services/parseInvoiceApi'

interface InvoiceDropzoneProps {
  services: ServiceConfig[]
  /** Se llama cuando la IA leyó la factura y matcheó un servicio existente (por `account_number`, o por categoría si es la única de ese tipo). */
  onMatch: (service: ServiceConfig, montoDetectado: number) => void
  /** Se llama cuando no matcheó ningún servicio existente — para precargar el alta de uno nuevo. */
  onNoMatch: (sugerencia: { accountNumber: string; category?: FixedExpenseCategory; montoDetectado: number }) => void
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
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isProcessing) {
          e.preventDefault()
          fileInputRef.current?.click()
        }
      }}
      aria-label="Subir factura en PDF para registrar un pago"
      // Barra de una línea (antes un recuadro grande): subir facturas es
      // ocasional y no debería ser lo primero que se ve de la pantalla.
      className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
        isDraggingOver ? 'border-accent bg-accent/5' : 'border-line-strong hover:border-accent/60 hover:bg-line/30'
      }`}
    >
      <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileInputChange} />

      {isProcessing ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
      ) : isDraggingOver ? (
        <FileText className="h-4 w-4 shrink-0 text-accent" />
      ) : (
        <Sparkles className="h-4 w-4 shrink-0 text-accent" />
      )}
      <p className="text-sm text-ink-soft">
        {isProcessing ? (
          'Analizando factura con IA…'
        ) : (
          <>
            <span className="font-medium text-ink">Arrastrá una factura PDF</span>
            <span className="text-muted"> o hacé clic — detectamos el servicio y el monto.</span>
          </>
        )}
      </p>
    </div>
  )
}

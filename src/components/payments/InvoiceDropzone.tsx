import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { isFixedExpenseCategory, type FixedExpenseCategory, type ServiceConfig } from '../../types/finance'
import { onlyDigits, parseInvoicePdf } from '../../services/parseInvoiceApi'
import { FileDropBar } from '../common/FileDropBar'

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
  const [isProcessing, setIsProcessing] = useState(false)

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

  return (
    <FileDropBar
      accept="application/pdf"
      onFile={(file) => void processPdf(file)}
      isProcessing={isProcessing}
      title="Arrastrá una factura PDF"
      hint="o hacé clic — detectamos el servicio y el monto."
      processingLabel="Analizando factura con IA…"
      icon={Sparkles}
      ariaLabel="Subir factura en PDF para registrar un pago"
    />
  )
}

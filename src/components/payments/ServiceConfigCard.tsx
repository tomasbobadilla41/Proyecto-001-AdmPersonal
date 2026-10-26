import { useRef, useState, type ChangeEvent } from 'react'
import { Check, Copy, Loader2, Pencil, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { ServiceConfig } from '../../types/finance'
import { FIXED_CATEGORY_ICONS } from '../../utils/serviceIcons'
import { onlyDigits, parseInvoicePdf } from '../../services/parseInvoiceApi'
import { isSafeHttpUrl } from '../../utils/url'

interface ServiceConfigCardProps {
  service: ServiceConfig
  isPaidThisMonth: boolean
  onEdit: () => void
  onDelete: () => void
  onRegisterPayment: () => void
  /** Se llama cuando la IA leyó el monto de una factura subida directo a esta tarjeta (sin pasar por el matching del dropzone general — ya sabemos de qué servicio es). */
  onInvoiceAmountDetected: (montoDetectado: number) => void
}

export function ServiceConfigCard({
  service,
  isPaidThisMonth,
  onEdit,
  onDelete,
  onRegisterPayment,
  onInvoiceAmountDetected,
}: ServiceConfigCardProps) {
  const [copied, setCopied] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const Icon = FIXED_CATEGORY_ICONS[service.category]

  async function handleCopy() {
    if (!service.accountNumber) return
    try {
      await navigator.clipboard.writeText(service.accountNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard no disponible (permiso denegado, contexto no seguro, etc.) — no rompemos nada.
    }
  }

  async function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setIsProcessing(true)
    try {
      const data = await parseInvoicePdf(file)

      if (data.source === 'regex') {
        toast.info('Gemini no respondió — se usó el monto leído sin IA. Revisalo antes de confirmar.')
      }

      // Ya sabemos de qué servicio es esta factura (la subieron en esta
      // tarjeta a propósito), así que no hace falta matchear por cuenta —
      // solo avisamos si el número leído no coincide, por si se equivocaron
      // de archivo, pero igual dejamos precargar el monto.
      if (service.accountNumber && onlyDigits(data.numero_cliente) !== onlyDigits(service.accountNumber)) {
        toast.warning(
          `El número de cliente de la factura ("${data.numero_cliente}") no coincide con el configurado ("${service.accountNumber}") — revisá el monto antes de confirmar.`,
        )
      }

      onInvoiceAmountDetected(data.monto_total)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al leer factura. Probá de nuevo en unos segundos.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-blue-400" />
          <div>
            <p className="font-medium text-ink">{service.title}</p>
            <p className="text-xs text-faint">
              {service.category}
              {service.dueDay ? ` · Vence el día ${service.dueDay}` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Editar servicio"
            className="rounded-lg p-1 text-faint transition-colors hover:bg-line hover:text-ink-soft"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Eliminar servicio"
            className="rounded-lg p-1 text-faint transition-colors hover:bg-rose-500/10 hover:text-rose-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <span
        className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${
          isPaidThisMonth ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'
        }`}
      >
        {isPaidThisMonth ? 'Pagado este mes' : 'Pendiente'}
      </span>

      {service.accountNumber && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-app px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs text-faint">Nro. de cuenta / cliente</p>
            <p className="truncate text-sm font-medium text-ink">{service.accountNumber}</p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copiar número"
            title="Copiar número"
            className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-line hover:text-emerald-400"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      )}

      <div className="flex gap-2">
        {service.paymentLink && isSafeHttpUrl(service.paymentLink) && (
          <a
            href={service.paymentLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-lg bg-accent px-3 py-2 text-center text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong"
          >
            Ir a Pagar
          </a>
        )}
        <button
          type="button"
          onClick={onRegisterPayment}
          className="flex-1 rounded-lg border border-line-strong px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-line"
        >
          Registrar Pago
        </button>
        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileInputChange} />
        <button
          type="button"
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          disabled={isProcessing}
          aria-label="Subir factura en PDF"
          title="Subir factura en PDF"
          className="shrink-0 rounded-lg border border-line-strong px-3 py-2 text-ink-soft transition-colors hover:bg-line disabled:opacity-50"
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

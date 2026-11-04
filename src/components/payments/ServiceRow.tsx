import { useRef, useState, type ChangeEvent } from 'react'
import { Check, CheckCircle2, Copy, ExternalLink, Loader2, MoreHorizontal, Pencil, Receipt, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { Expense, ServiceConfig } from '../../types/finance'
import { FIXED_CATEGORY_ICONS } from '../../utils/serviceIcons'
import { onlyDigits, parseInvoicePdf } from '../../services/parseInvoiceApi'
import { isSafeHttpUrl } from '../../utils/url'
import { formatMoney } from '../../utils/currency'
import { formatDateAR } from '../../utils/finance'
import { formatDueStatus, getDueStatus, type DueStatus } from '../../utils/dueDate'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

interface ServiceRowProps {
  service: ServiceConfig
  /** Gasto ya registrado este mes para el servicio; `undefined` si está pendiente. */
  paidExpense: Expense | undefined
  onEdit: () => void
  onDelete: () => void
  onRegisterPayment: () => void
  /** La IA leyó el monto de una factura subida desde esta fila (ya sabemos de qué servicio es, no hace falta matchear). */
  onInvoiceAmountDetected: (montoDetectado: number) => void
}

const DUE_CLASSNAME: Record<DueStatus['kind'], string> = {
  none: 'text-faint',
  overdue: 'font-medium text-negative',
  soon: 'font-medium text-warning',
  later: 'text-faint',
}

/**
 * Un servicio del Centro de Pagos como fila de lista. Pendiente: muestra el
 * vencimiento y las dos acciones frecuentes (Pagar / Registrar) a la vista.
 * Pagado: versión compacta con el monto y la fecha del pago. Lo ocasional
 * (subir factura, editar, eliminar) va en el menú ⋯.
 */
export function ServiceRow({
  service,
  paidExpense,
  onEdit,
  onDelete,
  onRegisterPayment,
  onInvoiceAmountDetected,
}: ServiceRowProps) {
  const [copied, setCopied] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const Icon = FIXED_CATEGORY_ICONS[service.category]
  const isPaid = paidExpense !== undefined
  const dueStatus = getDueStatus(service.dueDay)
  const paymentLink = service.paymentLink && isSafeHttpUrl(service.paymentLink) ? service.paymentLink : undefined

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

      // Ya sabemos de qué servicio es (se subió desde esta fila a propósito):
      // solo avisamos si el número no coincide, por si se equivocaron de
      // archivo, pero igual dejamos precargar el monto.
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
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isPaid ? 'bg-positive/10 text-positive' : 'bg-line text-muted'
          }`}
        >
          {isPaid ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-medium ${isPaid ? 'text-ink-soft' : 'text-ink'}`}>{service.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            {isPaid ? (
              <span className="text-faint">
                Pagado {formatMoney({ amount: paidExpense.monto, currency: paidExpense.moneda })} el{' '}
                {formatDateAR(paidExpense.fecha).slice(0, 5)}
              </span>
            ) : (
              <span className={DUE_CLASSNAME[dueStatus.kind]}>{formatDueStatus(dueStatus)}</span>
            )}
            {service.accountNumber && (
              <button
                type="button"
                onClick={handleCopy}
                title="Copiar número de cuenta / cliente"
                className="inline-flex max-w-full items-center gap-1 rounded px-1 text-faint transition-colors hover:bg-line hover:text-ink-soft"
              >
                <span className="truncate tabular-nums">Nº {service.accountNumber}</span>
                {copied ? <Check className="h-3 w-3 shrink-0 text-positive" /> : <Copy className="h-3 w-3 shrink-0" />}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pl-12 sm:pl-0">
        {!isPaid && paymentLink && (
          <a
            href={paymentLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
          >
            Pagar
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {!isPaid && (
          <button
            type="button"
            onClick={onRegisterPayment}
            className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-line"
          >
            Registrar
          </button>
        )}

        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileInputChange} />
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={isProcessing}
            aria-label={`Más acciones para ${service.title}`}
            className="ml-auto rounded-lg p-1.5 text-faint outline-none transition-colors hover:bg-line hover:text-ink-soft focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 sm:ml-0"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {isPaid && (
              <DropdownMenuItem onClick={onRegisterPayment}>
                <Receipt className="h-4 w-4" />
                Registrar otro pago
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Subir factura (PDF)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Editar servicio
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}

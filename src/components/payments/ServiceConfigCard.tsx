import { useState } from 'react'
import { Check, Copy, Pencil, Trash2 } from 'lucide-react'
import type { ServiceConfig } from '../../types/finance'
import { FIXED_CATEGORY_ICONS } from '../../utils/serviceIcons'

interface ServiceConfigCardProps {
  service: ServiceConfig
  onEdit: () => void
  onDelete: () => void
  onRegisterPayment: () => void
}

export function ServiceConfigCard({ service, onEdit, onDelete, onRegisterPayment }: ServiceConfigCardProps) {
  const [copied, setCopied] = useState(false)
  const Icon = FIXED_CATEGORY_ICONS[service.category]

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(service.accountNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard no disponible (permiso denegado, contexto no seguro, etc.) — no rompemos nada.
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-blue-400" />
          <span className="font-medium text-slate-100">{service.category}</span>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Editar servicio"
            className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Eliminar servicio"
            className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">Nro. de cuenta / cliente</p>
          <p className="truncate text-sm font-medium text-slate-100">{service.accountNumber}</p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copiar número"
          title="Copiar número"
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-emerald-400"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex gap-2">
        <a
          href={service.paymentLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-center text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
        >
          Ir a Pagar
        </a>
        <button
          type="button"
          onClick={onRegisterPayment}
          className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
        >
          Registrar Pago
        </button>
      </div>
    </div>
  )
}

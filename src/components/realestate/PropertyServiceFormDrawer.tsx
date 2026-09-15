import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { PropertyServiceConfig } from '../../types/realEstate'

interface PropertyServiceFormDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (config: PropertyServiceConfig) => void
  propertyId: string
  /** Si se pasa, el formulario edita ese servicio; si no, agrega uno nuevo. */
  initialConfig?: PropertyServiceConfig
}

const INPUT_CLASSNAME =
  'w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none'

export function PropertyServiceFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  propertyId,
  initialConfig,
}: PropertyServiceFormDrawerProps) {
  const isEditMode = Boolean(initialConfig)

  const [serviceName, setServiceName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [isAutoDebit, setIsAutoDebit] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (initialConfig) {
      setServiceName(initialConfig.serviceName)
      setAccountNumber(initialConfig.accountNumber)
      setIsAutoDebit(initialConfig.isAutoDebit)
    } else {
      setServiceName('')
      setAccountNumber('')
      setIsAutoDebit(false)
    }
  }, [isOpen, initialConfig])

  if (!isOpen) return null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!serviceName.trim() || !accountNumber.trim()) return

    onSubmit({
      id: initialConfig?.id ?? `psvc-${Date.now()}`,
      propertyId,
      serviceName: serviceName.trim(),
      accountNumber: accountNumber.trim(),
      isAutoDebit,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="flex h-full w-full max-w-sm flex-col gap-6 overflow-y-auto border-l border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">
            {isEditMode ? 'Editar servicio' : 'Agregar servicio'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Servicio
            <input
              type="text"
              required
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="Ej: Edenor, Naturgy, ARBA, Municipio"
              className={INPUT_CLASSNAME}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Nro. de cuenta / cliente
            <input
              type="text"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Ej: 123456789"
              className={INPUT_CLASSNAME}
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={isAutoDebit}
              onChange={(e) => setIsAutoDebit(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
            />
            Está en débito automático
          </label>

          <button
            type="submit"
            className="mt-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
          >
            {isEditMode ? 'Guardar cambios' : 'Guardar servicio'}
          </button>
        </form>
      </div>
    </div>
  )
}

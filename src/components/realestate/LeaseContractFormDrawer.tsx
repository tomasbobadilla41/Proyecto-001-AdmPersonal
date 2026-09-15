import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { LeaseContract, RentIndexType } from '../../types/realEstate'

interface LeaseContractFormDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (contract: LeaseContract) => void
  propertyId: string
  /** Si se pasa, el formulario edita ese contrato; si no, crea uno nuevo. */
  initialContract?: LeaseContract
}

const INPUT_CLASSNAME =
  'w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none'

export function LeaseContractFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  propertyId,
  initialContract,
}: LeaseContractFormDrawerProps) {
  const isEditMode = Boolean(initialContract)

  const [tenantName, setTenantName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [initialRentAmount, setInitialRentAmount] = useState('')
  const [currentRentAmount, setCurrentRentAmount] = useState('')
  const [updateFrequencyMonths, setUpdateFrequencyMonths] = useState('3')
  const [indexType, setIndexType] = useState<RentIndexType>('IPC')
  const [baseIndexValue, setBaseIndexValue] = useState('')

  useEffect(() => {
    if (!isOpen) return
    if (initialContract) {
      setTenantName(initialContract.tenantName)
      setStartDate(initialContract.startDate)
      setEndDate(initialContract.endDate)
      setInitialRentAmount(String(initialContract.initialRentAmount))
      setCurrentRentAmount(String(initialContract.currentRentAmount))
      setUpdateFrequencyMonths(String(initialContract.updateFrequencyMonths))
      setIndexType(initialContract.indexType)
      setBaseIndexValue(initialContract.baseIndexValue !== undefined ? String(initialContract.baseIndexValue) : '')
    } else {
      setTenantName('')
      setStartDate('')
      setEndDate('')
      setInitialRentAmount('')
      setCurrentRentAmount('')
      setUpdateFrequencyMonths('3')
      setIndexType('IPC')
      setBaseIndexValue('')
    }
  }, [isOpen, initialContract])

  if (!isOpen) return null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const initialAmount = Number(initialRentAmount)
    const frequency = Number(updateFrequencyMonths)
    if (!tenantName.trim() || !startDate || !endDate || !initialAmount || initialAmount <= 0 || !frequency || frequency <= 0) {
      return
    }
    // Si no se cargó "precio actual", arranca igual al precio base.
    const currentAmount = Number(currentRentAmount) || initialAmount

    onSubmit({
      id: initialContract?.id ?? `lease-${Date.now()}`,
      propertyId,
      tenantName: tenantName.trim(),
      startDate,
      endDate,
      initialRentAmount: initialAmount,
      currentRentAmount: currentAmount,
      updateFrequencyMonths: frequency,
      indexType,
      baseIndexValue: indexType === 'FIJO' ? undefined : Number(baseIndexValue) || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="flex h-full w-full max-w-sm flex-col gap-6 overflow-y-auto border-l border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">
            {isEditMode ? 'Editar contrato' : 'Crear contrato'}
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
            Inquilino
            <input
              type="text"
              required
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Nombre del inquilino"
              className={INPUT_CLASSNAME}
            />
          </label>

          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm text-slate-300">
              Fecha de inicio
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={INPUT_CLASSNAME}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm text-slate-300">
              Fecha de fin
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={INPUT_CLASSNAME}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Precio base (al firmar)
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={initialRentAmount}
              onChange={(e) => setInitialRentAmount(e.target.value)}
              placeholder="0.00"
              className={INPUT_CLASSNAME}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Precio actual
            <input
              type="number"
              min="0"
              step="0.01"
              value={currentRentAmount}
              onChange={(e) => setCurrentRentAmount(e.target.value)}
              placeholder="Si lo dejás vacío, arranca igual al precio base"
              className={INPUT_CLASSNAME}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Frecuencia de actualización (meses)
            <input
              type="number"
              min="1"
              step="1"
              required
              value={updateFrequencyMonths}
              onChange={(e) => setUpdateFrequencyMonths(e.target.value)}
              placeholder="Ej: 3, 4, 6"
              className={INPUT_CLASSNAME}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Tipo de índice
            <select
              value={indexType}
              onChange={(e) => setIndexType(e.target.value as RentIndexType)}
              className={INPUT_CLASSNAME}
            >
              <option value="IPC">IPC</option>
              <option value="ICL">ICL</option>
              <option value="FIJO">Fijo (sin índice)</option>
            </select>
          </label>

          {indexType !== 'FIJO' && (
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              Valor del índice al firmar (opcional)
              <input
                type="number"
                min="0"
                step="0.01"
                value={baseIndexValue}
                onChange={(e) => setBaseIndexValue(e.target.value)}
                placeholder="Ej: 1234.56"
                className={INPUT_CLASSNAME}
              />
            </label>
          )}

          <button
            type="submit"
            className="mt-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
          >
            {isEditMode ? 'Guardar cambios' : 'Guardar contrato'}
          </button>
        </form>
      </div>
    </div>
  )
}

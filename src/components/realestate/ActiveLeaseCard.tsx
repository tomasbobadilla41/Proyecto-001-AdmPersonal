import { useState } from 'react'
import { AlertTriangle, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import type { LeaseContract } from '../../types/realEstate'
import { formatMoney } from '../../utils/currency'
import { getContractProgress, isIncreaseMonth } from '../../utils/leaseContract'
import { RentUpdateCalculator } from './RentUpdateCalculator'

interface ActiveLeaseCardProps {
  contract: LeaseContract | undefined
  month: number
  year: number
  onCreate: () => void
  onEdit: (contract: LeaseContract) => void
  onDelete: (contract: LeaseContract) => void
  onSaveRentUpdate: (newAmount: number) => void
}

const INDEX_LABELS: Record<LeaseContract['indexType'], string> = {
  IPC: 'IPC',
  ICL: 'ICL',
  FIJO: 'Fijo (sin índice)',
}

export function ActiveLeaseCard({
  contract,
  month,
  year,
  onCreate,
  onEdit,
  onDelete,
  onSaveRentUpdate,
}: ActiveLeaseCardProps) {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)

  if (!contract) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-panel p-5">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted">
          <FileText className="h-4 w-4" />
          Contrato Activo
        </h3>
        <p className="text-sm text-faint">No hay un contrato vigente para este período.</p>
        <button
          type="button"
          onClick={onCreate}
          className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent transition-colors hover:bg-accent-strong"
        >
          <Plus className="h-3.5 w-3.5" />
          Crear Contrato
        </button>
      </div>
    )
  }

  const progress = getContractProgress(contract, month, year)
  const showsBanner = isIncreaseMonth(contract, month, year)

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted">
          <FileText className="h-4 w-4" />
          Contrato Activo
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onEdit(contract)}
            aria-label="Editar contrato"
            className="rounded-lg p-1.5 text-faint transition-colors hover:bg-line hover:text-ink-soft"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(contract)}
            aria-label="Eliminar contrato"
            className="rounded-lg p-1.5 text-faint transition-colors hover:bg-rose-500/10 hover:text-rose-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs text-faint">Inquilino</p>
          <p className="truncate text-sm font-medium text-ink">{contract.tenantName}</p>
        </div>
        <div>
          <p className="text-xs text-faint">Precio actual</p>
          <p className="text-sm font-medium text-emerald-400">
            {formatMoney({ amount: contract.currentRentAmount, currency: 'ARS' })}
          </p>
        </div>
        <div>
          <p className="text-xs text-faint">Índice</p>
          <p className="text-sm font-medium text-ink">{INDEX_LABELS[contract.indexType]}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs text-faint">
          <span>Progreso del contrato</span>
          <span>
            Mes {progress.elapsedMonths} de {progress.totalMonths}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {showsBanner && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            Corresponde actualización por {INDEX_LABELS[contract.indexType]}
          </div>
          <button
            type="button"
            onClick={() => setIsCalculatorOpen(true)}
            className="self-start rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-on-accent transition-colors hover:bg-amber-400"
          >
            Calcular Nuevo Monto
          </button>
        </div>
      )}

      <RentUpdateCalculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        currentAmount={contract.currentRentAmount}
        indexType={contract.indexType}
        initialBaseIndexValue={contract.baseIndexValue}
        onApply={onSaveRentUpdate}
      />
    </div>
  )
}

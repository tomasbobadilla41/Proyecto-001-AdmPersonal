import { useState } from 'react'
import { AlertTriangle, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import type { LeaseContract } from '../../types/realEstate'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
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

/** Formatea 'YYYY-MM-DD' como 'MM/YYYY' sin pasar por Date (evita corrimientos de zona horaria). */
function formatMonthYear(isoDate: string): string {
  const [year, month] = isoDate.split('-')
  return `${month}/${year}`
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
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-line-strong bg-panel px-5 py-4">
        <div>
          <h3 className="text-sm font-medium text-ink">Sin contrato vigente</h3>
          <p className="text-xs text-faint">No hay un contrato que cubra este mes.</p>
        </div>
        <Button variant="outline" size="sm" onClick={onCreate}>
          <Plus />
          Crear contrato
        </Button>
      </section>
    )
  }

  const progress = getContractProgress(contract, month, year)
  const showsBanner = isIncreaseMonth(contract, month, year)

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">Contrato vigente</p>
          <p className="truncate text-lg font-semibold text-ink">{contract.tenantName}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Acciones del contrato"
            className="rounded-lg p-1.5 text-faint outline-none transition-colors hover:bg-line hover:text-ink-soft focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onEdit(contract)}>
              <Pencil className="h-4 w-4" />
              Editar contrato
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(contract)}>
              <Trash2 className="h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-faint">Alquiler actual</dt>
          <dd className="font-medium tabular-nums text-ink">
            {formatMoney({ amount: contract.currentRentAmount, currency: 'ARS' })}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-faint">Actualización</dt>
          <dd className="font-medium text-ink">
            {INDEX_LABELS[contract.indexType]}
            {contract.indexType !== 'FIJO' && ` · cada ${contract.updateFrequencyMonths} meses`}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-faint">Vigencia</dt>
          <dd className="font-medium tabular-nums text-ink">
            {formatMonthYear(contract.startDate)} – {formatMonthYear(contract.endDate)}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-faint">
          <span>Progreso</span>
          <span className="tabular-nums">
            Mes {progress.elapsedMonths} de {progress.totalMonths}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress.percentage}%` }} />
        </div>
      </div>

      {showsBanner && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Este mes corresponde actualizar por {INDEX_LABELS[contract.indexType]}
          </p>
          <Button size="sm" variant="outline" onClick={() => setIsCalculatorOpen(true)}>
            Calcular nuevo monto
          </Button>
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
    </section>
  )
}

import { useEffect, useState } from 'react'
import { Check, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { PropertyExpense, PropertyExpenseStatus, PropertyServiceConfig } from '../../types/realEstate'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { formatMoney } from '../../utils/currency'

interface ServiceChecklistRowProps {
  service: PropertyServiceConfig
  /** El `PropertyExpense` de este servicio para el mes/año que se está viendo, si ya se cargó. */
  expense: PropertyExpense | undefined
  propertyId: string
  month: number
  year: number
  onSave: (expense: PropertyExpense) => void
  onEditService: () => void
  onDeleteService: () => void
}

/**
 * Un servicio de la propiedad + su estado en el mes elegido. Los gastos de
 * propiedades no tienen campo de moneda: se cargan y muestran en ARS.
 */
export function ServiceChecklistRow({
  service,
  expense,
  propertyId,
  month,
  year,
  onSave,
  onEditService,
  onDeleteService,
}: ServiceChecklistRowProps) {
  const isPaid = expense?.status === 'PAID'
  const [isEditing, setIsEditing] = useState(!isPaid)
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')

  // Si cambia el mes/año (o llega otro gasto detrás), resincronizamos el input.
  useEffect(() => {
    setAmount(expense ? String(expense.amount) : '')
    setIsEditing(expense?.status !== 'PAID')
  }, [expense, month, year])

  function persist(status: PropertyExpenseStatus) {
    const numero = Number(amount)
    if (!numero || numero <= 0) return
    onSave({
      id: expense?.id ?? `pexp-${Date.now()}`,
      propertyId,
      serviceConfigId: service.id,
      // Se actualiza al nombre actual cada vez que se toca esta fila — el
      // snapshot solo queda "congelado" en los meses que no volvés a tocar.
      serviceName: service.serviceName,
      month,
      year,
      amount: numero,
      status,
    })
    setIsEditing(false)
  }

  const amountInput = (
    <Input
      type="number"
      min="0"
      step="0.01"
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
      placeholder={service.isAutoDebit ? 'Monto debitado' : '0.00'}
      aria-label={`Monto de ${service.serviceName}`}
      className="h-8 w-32 tabular-nums"
    />
  )

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-sm font-medium text-ink">{service.serviceName}</p>
        <p className="truncate text-xs text-faint">
          Cuenta {service.accountNumber}
          {service.isAutoDebit && ' · Débito automático'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {service.isAutoDebit ? (
          // Débito automático: no hay "pagar", solo registrar cuánto se debitó.
          <>
            {amountInput}
            <Button size="sm" variant="outline" className="w-28" onClick={() => persist('AUTO_DEBIT')}>
              {expense ? 'Actualizar' : 'Guardar'}
            </Button>
          </>
        ) : isEditing ? (
          <>
            {amountInput}
            <Button size="sm" variant="outline" className="w-28" onClick={() => persist('PAID')}>
              Marcar pagado
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm font-medium tabular-nums text-ink">
              {formatMoney({ amount: Number(amount) || 0, currency: 'ARS' })}
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-positive">
              <Check className="h-3.5 w-3.5" />
              Pagado
            </span>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Más acciones para ${service.serviceName}`}
            className="rounded-lg p-1.5 text-faint outline-none transition-colors hover:bg-line hover:text-ink-soft focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {isPaid && !isEditing && (
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4" />
                Corregir monto
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onEditService}>
              <Pencil className="h-4 w-4" />
              Editar servicio
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDeleteService}>
              <Trash2 className="h-4 w-4" />
              Eliminar servicio
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}

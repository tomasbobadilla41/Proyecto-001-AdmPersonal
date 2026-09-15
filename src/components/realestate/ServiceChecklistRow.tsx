import { useEffect, useState } from 'react'
import { Check, Lock, Pencil } from 'lucide-react'
import type { PropertyExpense, PropertyExpenseStatus, PropertyServiceConfig } from '../../types/realEstate'
import { formatMoney } from '../../utils/currency'

interface ServiceChecklistRowProps {
  service: PropertyServiceConfig
  /** El `PropertyExpense` de este servicio para el mes/año que se está viendo, si ya se cargó. */
  expense: PropertyExpense | undefined
  propertyId: string
  month: number
  year: number
  onSave: (expense: PropertyExpense) => void
}

const AMOUNT_INPUT_CLASSNAME =
  'w-28 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none'

export function ServiceChecklistRow({ service, expense, propertyId, month, year, onSave }: ServiceChecklistRowProps) {
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

  return (
    <tr className="text-slate-200">
      <td className="whitespace-nowrap px-4 py-3 font-medium">{service.serviceName}</td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-400">{service.accountNumber}</td>
      <td className="whitespace-nowrap px-4 py-3">
        {service.isAutoDebit ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Monto debitado"
              className={AMOUNT_INPUT_CLASSNAME}
            />
            <button
              type="button"
              onClick={() => persist('AUTO_DEBIT')}
              className="text-xs font-medium text-blue-400 hover:text-blue-300"
            >
              Guardar
            </button>
          </div>
        ) : isEditing ? (
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={AMOUNT_INPUT_CLASSNAME}
          />
        ) : (
          <span className="text-sm font-medium text-slate-100">
            {formatMoney({ amount: Number(amount) || 0, currency: 'ARS' })}
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        {service.isAutoDebit ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
            <Lock className="h-3 w-3" />
            Débito Automático
          </span>
        ) : isEditing ? (
          <button
            type="button"
            onClick={() => persist('PAID')}
            className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
          >
            Marcar como Pagado
          </button>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
              <Check className="h-3 w-3" />
              Pagado
            </span>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              aria-label="Editar monto"
              className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

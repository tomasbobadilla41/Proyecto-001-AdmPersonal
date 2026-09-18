import { CreditCard } from 'lucide-react'
import type { Expense } from '../../types/finance'
import { formatMoney } from '../../utils/currency'
import { parseInstallmentInfo } from '../../utils/installments'
import { ProgressBar } from '../common/ProgressBar'

interface ActiveInstallmentsWidgetProps {
  /** Gastos ya filtrados al mes actual. */
  expenses: Expense[]
}

/** Compras en cuotas del mes actual (detectadas por el sufijo "(Cuota X/Y)" en la descripción). */
export function ActiveInstallmentsWidget({ expenses }: ActiveInstallmentsWidgetProps) {
  const installments = expenses
    .map((expense) => {
      const info = parseInstallmentInfo(expense.descripcion)
      return info ? { expense, info } : null
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5">
      <h3 className="flex items-center gap-2 text-sm font-medium text-muted">
        <CreditCard className="h-4 w-4" />
        Compras en Cuotas Activas
      </h3>

      {installments.length === 0 ? (
        <p className="text-sm text-faint">No tenés compras en cuotas este mes.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {installments.map(({ expense, info }) => (
            <li key={expense.id} className="flex flex-col gap-2 rounded-lg border border-line bg-app p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-ink">{info.productName}</span>
                <span className="shrink-0 text-sm font-semibold text-ink">
                  {formatMoney({ amount: expense.monto, currency: expense.moneda })}
                </span>
              </div>
              <ProgressBar value={(info.current / info.total) * 100} />
              <span className="text-xs text-faint">
                Cuota {info.current} de {info.total}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

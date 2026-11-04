import type { Expense } from '../../types/finance'
import { formatMoney } from '../../utils/currency'
import { ConfirmDialog } from '../common/ConfirmDialog'

interface DeleteExpenseDialogProps {
  /** Gasto a confirmar; `null` cierra el diálogo. */
  expense: Expense | null
  onCancel: () => void
  onConfirm: (expense: Expense) => void
}

/** Confirmación de borrado de un gasto. */
export function DeleteExpenseDialog({ expense, onCancel, onConfirm }: DeleteExpenseDialogProps) {
  return (
    <ConfirmDialog
      open={expense !== null}
      title="¿Eliminar este gasto?"
      description={
        expense && (
          <>
            <span className="font-medium text-ink-soft">{expense.descripcion}</span> por{' '}
            {formatMoney({ amount: expense.monto, currency: expense.moneda })}. Esta acción no se puede deshacer.
          </>
        )
      }
      confirmLabel="Eliminar"
      destructive
      onCancel={onCancel}
      onConfirm={() => expense && onConfirm(expense)}
    />
  )
}

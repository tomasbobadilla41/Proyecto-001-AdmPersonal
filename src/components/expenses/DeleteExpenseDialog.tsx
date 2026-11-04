import type { Expense } from '../../types/finance'
import { formatMoney } from '../../utils/currency'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

interface DeleteExpenseDialogProps {
  /** Gasto a confirmar; `null` cierra el diálogo. */
  expense: Expense | null
  onCancel: () => void
  onConfirm: (expense: Expense) => void
}

/** Confirmación de borrado con el estilo de la app (reemplaza al `window.confirm` nativo). */
export function DeleteExpenseDialog({ expense, onCancel, onConfirm }: DeleteExpenseDialogProps) {
  return (
    <Dialog open={expense !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>¿Eliminar este gasto?</DialogTitle>
          {expense && (
            <DialogDescription>
              <span className="font-medium text-ink-soft">{expense.descripcion}</span> por{' '}
              {formatMoney({ amount: expense.monto, currency: expense.moneda })}. Esta acción no se puede deshacer.
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={() => expense && onConfirm(expense)}>
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

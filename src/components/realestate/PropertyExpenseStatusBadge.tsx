import type { PropertyExpenseStatus } from '../../types/realEstate'

interface PropertyExpenseStatusBadgeProps {
  status: PropertyExpenseStatus
}

const STYLES: Record<PropertyExpenseStatus, { label: string; className: string }> = {
  PAID: { label: 'Pagado', className: 'bg-emerald-500/10 text-emerald-400' },
  PENDING: { label: 'Pendiente', className: 'bg-amber-500/10 text-amber-400' },
  AUTO_DEBIT: { label: 'Débito automático', className: 'bg-blue-500/10 text-blue-400' },
}

export function PropertyExpenseStatusBadge({ status }: PropertyExpenseStatusBadgeProps) {
  const { label, className } = STYLES[status]

  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

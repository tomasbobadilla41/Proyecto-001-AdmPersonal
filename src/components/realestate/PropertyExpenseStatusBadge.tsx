import type { PropertyExpenseStatus } from '../../types/realEstate'

interface PropertyExpenseStatusBadgeProps {
  status: PropertyExpenseStatus
}

const STYLES: Record<PropertyExpenseStatus, { label: string; className: string }> = {
  PAID: { label: 'Pagado', className: 'bg-positive/10 text-positive' },
  PENDING: { label: 'Pendiente', className: 'bg-warning/10 text-warning' },
  AUTO_DEBIT: { label: 'Débito automático', className: 'bg-accent/10 text-accent' },
}

export function PropertyExpenseStatusBadge({ status }: PropertyExpenseStatusBadgeProps) {
  const { label, className } = STYLES[status]

  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

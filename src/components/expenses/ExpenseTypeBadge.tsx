import type { ExpenseType } from '../../types/finance'

interface ExpenseTypeBadgeProps {
  expenseType: ExpenseType
}

const STYLES: Record<ExpenseType, { label: string; className: string }> = {
  FIJO: { label: 'Fijo', className: 'bg-fijos/10 text-fijos' },
  FLEXIBLE: { label: 'Flexible', className: 'bg-flexibles/10 text-flexibles' },
}

export function ExpenseTypeBadge({ expenseType }: ExpenseTypeBadgeProps) {
  const { label, className } = STYLES[expenseType]

  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

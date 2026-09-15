import type { ExpenseType } from '../../types/finance'

interface ExpenseTypeBadgeProps {
  expenseType: ExpenseType
}

const STYLES: Record<ExpenseType, { label: string; className: string }> = {
  FIJO: { label: 'Fijo', className: 'bg-blue-500/10 text-blue-400' },
  FLEXIBLE: { label: 'Flexible', className: 'bg-orange-500/10 text-orange-400' },
}

export function ExpenseTypeBadge({ expenseType }: ExpenseTypeBadgeProps) {
  const { label, className } = STYLES[expenseType]

  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

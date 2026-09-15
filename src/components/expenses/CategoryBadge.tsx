import type { ExpenseCategory } from '../../types/finance'
import { CATEGORY_COLORS } from '../../utils/categoryColors'

interface CategoryBadgeProps {
  category: ExpenseCategory
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const { badgeClassName } = CATEGORY_COLORS[category]

  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${badgeClassName}`}>
      {category}
    </span>
  )
}

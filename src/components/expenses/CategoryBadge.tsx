import type { ExpenseCategory } from '../../types/finance'
import { CATEGORY_COLORS } from '../../utils/categoryColors'

interface CategoryBadgeProps {
  category: ExpenseCategory
}

/** Badge neutro con un punto del color de la categoría (el mismo del gráfico de torta). */
export function CategoryBadge({ category }: CategoryBadgeProps) {
  const { chartColor } = CATEGORY_COLORS[category]

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-line/60 px-2 py-0.5 text-xs font-medium text-ink-soft">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: chartColor }} />
      {category}
    </span>
  )
}

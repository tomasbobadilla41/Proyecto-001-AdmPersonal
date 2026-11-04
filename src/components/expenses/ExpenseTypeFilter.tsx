import type { ExpenseType } from '../../types/finance'

export type ExpenseTypeFilterValue = ExpenseType | 'TODOS'

interface ExpenseTypeFilterProps {
  value: ExpenseTypeFilterValue
  onChange: (value: ExpenseTypeFilterValue) => void
}

/** Mismos colores que el tipo de cada fila en `ExpenseList` (text-fijos / text-flexibles). */
const OPTIONS: { value: ExpenseTypeFilterValue; label: string; activeClassName: string }[] = [
  { value: 'TODOS', label: 'Todos', activeClassName: 'bg-line text-ink' },
  { value: 'FIJO', label: 'Fijo', activeClassName: 'bg-fijos/10 text-fijos' },
  { value: 'FLEXIBLE', label: 'Flexible', activeClassName: 'bg-flexibles/10 text-flexibles' },
]

/** Filtro de Tipo (Fijo/Flexible) para la tabla de Gastos — vive junto al selector de mes/año. */
export function ExpenseTypeFilter({ value, onChange }: ExpenseTypeFilterProps) {
  return (
    <div role="group" aria-label="Filtrar por tipo de gasto" className="flex items-center gap-1 rounded-lg border border-line bg-panel p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === option.value ? option.activeClassName : 'text-faint hover:text-ink-soft'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

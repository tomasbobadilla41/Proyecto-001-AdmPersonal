import { MESES_LARGOS } from '../../utils/finance'

interface Period {
  mes: number
  anio: number
}

interface MonthSelectorProps {
  /** Períodos disponibles, en cualquier orden — se listan del más nuevo al más viejo. */
  periods: Period[]
  selected: Period
  onChange: (period: Period) => void
}

function periodKey({ mes, anio }: Period): string {
  return `${anio}-${mes}`
}

/** Desplegable único para elegir qué mes mostrar en el Dashboard (a diferencia de `MonthYearSelector`, que son dos selects separados sin acotar a un rango). */
export function MonthSelector({ periods, selected, onChange }: MonthSelectorProps) {
  const sorted = [...periods].sort((a, b) => b.anio - a.anio || b.mes - a.mes)

  function handleChange(value: string) {
    const period = periods.find((p) => periodKey(p) === value)
    if (period) onChange(period)
  }

  return (
    <select
      aria-label="Mes del Dashboard"
      value={periodKey(selected)}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink-soft focus:border-accent focus:outline-none"
    >
      {sorted.map((period) => (
        <option key={periodKey(period)} value={periodKey(period)}>
          {MESES_LARGOS[period.mes - 1]} {period.anio}
        </option>
      ))}
    </select>
  )
}

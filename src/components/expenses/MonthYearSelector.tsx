import { MESES_LARGOS } from '../../utils/finance'

interface MonthYearSelectorProps {
  mes: number
  anio: number
  years: number[]
  onMesChange: (mes: number) => void
  onAnioChange: (anio: number) => void
}

const SELECT_CLASSNAME =
  'rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink-soft focus:border-accent focus:outline-none'

export function MonthYearSelector({ mes, anio, years, onMesChange, onAnioChange }: MonthYearSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Mes"
        value={mes}
        onChange={(e) => onMesChange(Number(e.target.value))}
        className={SELECT_CLASSNAME}
      >
        {MESES_LARGOS.map((label, index) => (
          <option key={label} value={index + 1}>
            {label}
          </option>
        ))}
      </select>
      <select
        aria-label="Año"
        value={anio}
        onChange={(e) => onAnioChange(Number(e.target.value))}
        className={SELECT_CLASSNAME}
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  )
}

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MESES_LARGOS } from '../../utils/finance'

interface MonthNavigatorProps {
  mes: number
  anio: number
  onChange: (mes: number, anio: number) => void
}

const ARROW_CLASSNAME =
  'rounded-md p-1.5 text-muted transition-colors hover:bg-line hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'

/**
 * Navegador de mes `‹ Noviembre 2026 ›`. Reemplaza al par de `<select>`
 * mes/año: moverse un mes para atrás o adelante es lo más común, y así no
 * hace falta tocar dos controles. Si no estás en el mes actual, aparece
 * "Hoy" para volver de un toque.
 */
export function MonthNavigator({ mes, anio, onChange }: MonthNavigatorProps) {
  const now = new Date()
  const isCurrentMonth = mes === now.getMonth() + 1 && anio === now.getFullYear()

  function shift(delta: number) {
    // Índice absoluto de mes (0-based) para cruzar de año sin casos especiales.
    const index = anio * 12 + (mes - 1) + delta
    onChange((index % 12) + 1, Math.floor(index / 12))
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg border border-line bg-panel p-1">
        <button type="button" onClick={() => shift(-1)} aria-label="Mes anterior" className={ARROW_CLASSNAME}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[8.5rem] text-center text-sm font-medium text-ink" aria-live="polite">
          {MESES_LARGOS[mes - 1]} {anio}
        </span>
        <button type="button" onClick={() => shift(1)} aria-label="Mes siguiente" className={ARROW_CLASSNAME}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {!isCurrentMonth && (
        <button
          type="button"
          onClick={() => onChange(now.getMonth() + 1, now.getFullYear())}
          className="rounded-md px-2 py-1 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
        >
          Hoy
        </button>
      )}
    </div>
  )
}

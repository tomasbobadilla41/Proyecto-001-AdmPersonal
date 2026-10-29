interface ProgressBarProps {
  /** 0-100. Se clampea igual si viene fuera de rango. */
  value: number
  className?: string
  /** Color del relleno — por defecto `bg-accent` (ej: pasar `bg-rose-400` para marcar que se pasó de un límite). */
  indicatorClassName?: string
}

/**
 * Barra de progreso simple, con la misma pinta que la de shadcn/ui (track +
 * indicador redondeado) pero sin agregar esa librería (no está instalada en
 * el proyecto) — es un `<div>` con dos capas, usando los tokens de tema.
 */
export function ProgressBar({ value, className = '', indicatorClassName = 'bg-accent' }: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100)

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-2 w-full overflow-hidden rounded-full bg-line ${className}`}
    >
      <div className={`h-full rounded-full transition-all ${indicatorClassName}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}

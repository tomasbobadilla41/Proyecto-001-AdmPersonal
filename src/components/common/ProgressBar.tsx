interface ProgressBarProps {
  /** 0-100. Se clampea igual si viene fuera de rango. */
  value: number
  className?: string
}

/**
 * Barra de progreso simple, con la misma pinta que la de shadcn/ui (track +
 * indicador redondeado) pero sin agregar esa librería (no está instalada en
 * el proyecto) — es un `<div>` con dos capas, usando los tokens de tema.
 */
export function ProgressBar({ value, className = '' }: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100)

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-2 w-full overflow-hidden rounded-full bg-line ${className}`}
    >
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${clamped}%` }} />
    </div>
  )
}

interface SkeletonProps {
  className?: string
}

/** Bloque "pulsante" para loaders tipo esqueleto — reemplaza el texto plano "Cargando…" por placeholders con la forma del contenido real. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-line ${className}`} />
}

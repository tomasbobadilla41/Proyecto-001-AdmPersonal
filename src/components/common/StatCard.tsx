import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  icon?: LucideIcon
  iconClassName?: string
  children: ReactNode
  className?: string
}

/**
 * Tarjeta genérica de métrica (título + contenido), usada en Dashboard,
 * Inversiones y Propiedades. Sin sombra ni efecto hover: no es clickeable, y
 * un hover sugeriría lo contrario. El ícono va en gris — el color se reserva
 * para los datos (positivo/negativo, 50/30/20).
 */
export function StatCard({ title, icon: Icon, iconClassName, children, className = '' }: StatCardProps) {
  return (
    <div className={`flex flex-col gap-3 rounded-xl border border-line bg-panel p-5 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-muted">
        {Icon && <Icon className={`h-4 w-4 ${iconClassName ?? 'text-faint'}`} />}
        {title}
      </div>
      {children}
    </div>
  )
}

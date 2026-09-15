import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  icon: LucideIcon
  iconClassName?: string
  children: ReactNode
}

/** Tarjeta genérica de métrica (icono + título + contenido), usada en Dashboard e Inversiones. */
export function StatCard({ title, icon: Icon, iconClassName, children }: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-muted">
        <Icon className={`h-4 w-4 ${iconClassName ?? ''}`} />
        {title}
      </div>
      {children}
    </div>
  )
}

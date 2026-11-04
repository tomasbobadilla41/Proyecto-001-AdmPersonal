import type { ReactNode } from 'react'
import { CalendarClock, PieChart, Repeat, Wallet } from 'lucide-react'

const HIGHLIGHTS = [
  {
    icon: PieChart,
    title: 'Regla 50/30/20',
    description: 'Repartí tus ingresos entre gastos fijos, flexibles y ahorro sin hacer cuentas a mano.',
  },
  {
    icon: Repeat,
    title: 'ARS y USD',
    description: 'Registrá montos en pesos o dólares y mirá todo convertido al tipo de cambio del día.',
  },
  {
    icon: CalendarClock,
    title: 'Cuotas y recurrentes',
    description: 'Cargá una compra en cuotas una sola vez y la app la distribuye en los meses siguientes.',
  },
] as const

interface AuthShellProps {
  title: string
  description?: ReactNode
  children: ReactNode
}

/**
 * Layout de las pantallas de autenticación: panel de marca a la izquierda
 * (solo desktop) y el formulario a la derecha.
 */
export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <div className="grid min-h-screen bg-app text-ink lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca */}
      <aside className="relative hidden overflow-hidden border-r border-line bg-panel lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -bottom-32 h-80 w-80 rounded-full bg-ahorro/15 blur-3xl"
        />

        <Brand />

        <div className="relative max-w-md">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">
            Tus finanzas personales, <span className="text-accent-text">en un solo lugar.</span>
          </h2>
          <p className="mt-3 text-ink-soft">
            Gastos, ingresos, inversiones y servicios organizados para que sepas a dónde va cada peso.
          </p>

          <ul className="mt-10 flex flex-col gap-6">
            {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-app text-accent-text">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <BudgetPreview />
      </aside>

      {/* Formulario */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}

function Brand() {
  return (
    <div className="relative flex items-center gap-2.5 text-lg font-semibold">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-on-accent">
        <Wallet className="h-5 w-5" />
      </span>
      Adm Personal
    </div>
  )
}

/** Barra decorativa con la proporción 50/30/20 (mismos colores que el dashboard). */
function BudgetPreview() {
  const segments = [
    { label: 'Fijos', pct: 50, color: 'bg-fijos' },
    { label: 'Flexibles', pct: 30, color: 'bg-flexibles' },
    { label: 'Ahorro', pct: 20, color: 'bg-ahorro' },
  ]
  return (
    <div className="relative max-w-md rounded-xl border border-line bg-app/60 p-4 backdrop-blur">
      <div className="flex h-2 overflow-hidden rounded-full">
        {segments.map((s) => (
          <span key={s.label} className={s.color} style={{ width: `${s.pct}%` }} />
        ))}
      </div>
      <div className="mt-3 flex justify-between text-xs text-muted">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${s.color}`} />
            {s.label} {s.pct}%
          </span>
        ))}
      </div>
    </div>
  )
}

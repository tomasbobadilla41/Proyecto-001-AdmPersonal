import type { ReactNode } from 'react'
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { TabKey } from '../../types/navigation'

interface NavItem {
  key: TabKey
  label: string
  icon: LucideIcon
}

/** Finanzas personales. */
const PERSONAL_NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'gastos', label: 'Gastos', icon: Receipt },
  { key: 'inversiones', label: 'Inversiones', icon: TrendingUp },
  { key: 'pagos', label: 'Centro de Pagos', icon: CreditCard },
]

/** Propiedades en alquiler — a propósito separado de las finanzas personales. */
const PROPERTY_NAV_ITEMS: NavItem[] = [{ key: 'inmuebles', label: 'Propiedades', icon: Building2 }]

interface AppLayoutProps {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  children: ReactNode
}

export function AppLayout({ activeTab, onTabChange, children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 md:flex-row">
      {/* Menú lateral (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900/50 p-4 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2 text-lg font-semibold">
          <Wallet className="h-6 w-6 text-emerald-400" />
          Adm Personal
        </div>
        <nav className="flex flex-col gap-1">
          {PERSONAL_NAV_ITEMS.map((item) => (
            <NavButton key={item.key} item={item} active={activeTab === item.key} onClick={onTabChange} />
          ))}
        </nav>

        <div className="my-4 border-t border-slate-800" />
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          Inmuebles
        </p>
        <nav className="flex flex-col gap-1">
          {PROPERTY_NAV_ITEMS.map((item) => (
            <NavButton key={item.key} item={item} active={activeTab === item.key} onClick={onTabChange} />
          ))}
        </nav>
      </aside>

      {/* Encabezado + menú superior (mobile) */}
      <header className="flex flex-col border-b border-slate-800 bg-slate-900/50 md:hidden">
        <div className="flex items-center gap-2 px-4 py-3 text-lg font-semibold">
          <Wallet className="h-5 w-5 text-emerald-400" />
          Adm Personal
        </div>
        <nav className="flex border-t border-slate-800">
          {PERSONAL_NAV_ITEMS.map((item) => (
            <NavButton
              key={item.key}
              item={item}
              active={activeTab === item.key}
              onClick={onTabChange}
              variant="mobile"
            />
          ))}
          <div className="my-2 w-px bg-slate-800" />
          {PROPERTY_NAV_ITEMS.map((item) => (
            <NavButton
              key={item.key}
              item={item}
              active={activeTab === item.key}
              onClick={onTabChange}
              variant="mobile"
            />
          ))}
        </nav>
      </header>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  )
}

interface NavButtonProps {
  item: NavItem
  active: boolean
  onClick: (tab: TabKey) => void
  variant?: 'sidebar' | 'mobile'
}

function NavButton({ item, active, onClick, variant = 'sidebar' }: NavButtonProps) {
  const { key, label, icon: Icon } = item

  if (variant === 'mobile') {
    return (
      <button
        type="button"
        onClick={() => onClick(key)}
        className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
          active ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Icon className="h-4 w-4" />
        {label}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onClick(key)}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

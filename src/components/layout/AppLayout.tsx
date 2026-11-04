import type { ReactNode } from 'react'
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  MoreHorizontal,
  Receipt,
  Repeat,
  Settings,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { TabKey } from '../../types/navigation'
import { UserNav } from './UserNav'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

interface NavItem {
  key: TabKey
  label: string
  /** Etiqueta corta para la barra inferior mobile (si no, usa `label`). */
  shortLabel?: string
  icon: LucideIcon
}

/** Finanzas personales, ordenadas por frecuencia de uso. */
const PERSONAL_NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Resumen', shortLabel: 'Inicio', icon: LayoutDashboard },
  { key: 'gastos', label: 'Gastos', icon: Receipt },
  { key: 'pagos', label: 'Centro de Pagos', shortLabel: 'Pagos', icon: CreditCard },
  { key: 'suscripciones', label: 'Suscripciones', icon: Repeat },
  { key: 'inversiones', label: 'Inversiones', icon: TrendingUp },
]

/** Propiedades en alquiler — a propósito separado de las finanzas personales. */
const PROPERTY_NAV_ITEMS: NavItem[] = [{ key: 'inmuebles', label: 'Propiedades', icon: Building2 }]

const SETTINGS_NAV_ITEM: NavItem = { key: 'config', label: 'Configuración', icon: Settings }

/** Las 3 secciones de uso diario que van fijas en la barra inferior mobile; el resto va en "Más". */
const MOBILE_PRIMARY_KEYS: TabKey[] = ['dashboard', 'gastos', 'pagos']
const MOBILE_PRIMARY_ITEMS = PERSONAL_NAV_ITEMS.filter((item) => MOBILE_PRIMARY_KEYS.includes(item.key))
const MOBILE_MORE_ITEMS = [
  ...PERSONAL_NAV_ITEMS.filter((item) => !MOBILE_PRIMARY_KEYS.includes(item.key)),
  ...PROPERTY_NAV_ITEMS,
]

interface AppLayoutProps {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  children: ReactNode
}

export function AppLayout({ activeTab, onTabChange, children }: AppLayoutProps) {
  const isMoreActive = [...MOBILE_MORE_ITEMS, SETTINGS_NAV_ITEM].some((item) => item.key === activeTab)

  return (
    <div className="flex min-h-screen flex-col bg-app text-ink md:flex-row">
      {/* Menú lateral (desktop): navegación arriba, configuración y usuario al pie */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-panel px-3 py-5 md:flex">
        <Brand />

        <nav className="mt-6 flex flex-col gap-0.5">
          {PERSONAL_NAV_ITEMS.map((item) => (
            <SidebarButton key={item.key} item={item} active={activeTab === item.key} onClick={onTabChange} />
          ))}
        </nav>

        <p className="mb-1 mt-6 px-3 text-xs font-medium text-faint">Inmuebles</p>
        <nav className="flex flex-col gap-0.5">
          {PROPERTY_NAV_ITEMS.map((item) => (
            <SidebarButton key={item.key} item={item} active={activeTab === item.key} onClick={onTabChange} />
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-3">
          <SidebarButton
            item={SETTINGS_NAV_ITEM}
            active={activeTab === SETTINGS_NAV_ITEM.key}
            onClick={onTabChange}
          />
          <UserNav variant="sidebar" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Encabezado mobile: solo marca + usuario. La navegación va abajo, al alcance del pulgar. */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-panel/90 px-4 py-2.5 backdrop-blur md:hidden">
          <Brand />
          <UserNav />
        </header>

        {/* pb extra en mobile para que la barra inferior no tape el final del contenido */}
        <main className="min-w-0 flex-1 p-4 pb-24 sm:p-6 sm:pb-24 md:pb-6 lg:p-8">{children}</main>
      </div>

      {/* Barra inferior (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {MOBILE_PRIMARY_ITEMS.map((item) => (
          <BottomBarButton key={item.key} item={item} active={activeTab === item.key} onClick={onTabChange} />
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium outline-none transition-colors ${
              isMoreActive ? 'text-accent' : 'text-muted'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            Más
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="mb-2 w-56">
            {MOBILE_MORE_ITEMS.map(({ key, label, icon: Icon }) => (
              <DropdownMenuItem
                key={key}
                onClick={() => onTabChange(key)}
                className={activeTab === key ? 'text-accent' : undefined}
              >
                <Icon className="h-4 w-4" />
                {label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onTabChange(SETTINGS_NAV_ITEM.key)}
              className={activeTab === SETTINGS_NAV_ITEM.key ? 'text-accent' : undefined}
            >
              <Settings className="h-4 w-4" />
              {SETTINGS_NAV_ITEM.label}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2 text-base font-semibold tracking-tight">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-on-accent">
        <Wallet className="h-4 w-4" />
      </span>
      Adm Personal
    </div>
  )
}

interface NavButtonProps {
  item: NavItem
  active: boolean
  onClick: (tab: TabKey) => void
}

function SidebarButton({ item, active, onClick }: NavButtonProps) {
  const { key, label, icon: Icon } = item

  return (
    <button
      type="button"
      onClick={() => onClick(key)}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? 'bg-line font-medium text-ink' : 'text-muted hover:bg-line/60 hover:text-ink'
      }`}
    >
      <Icon className={`h-4 w-4 ${active ? 'text-accent' : ''}`} />
      {label}
    </button>
  )
}

function BottomBarButton({ item, active, onClick }: NavButtonProps) {
  const { key, label, shortLabel, icon: Icon } = item

  return (
    <button
      type="button"
      onClick={() => onClick(key)}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
        active ? 'text-accent' : 'text-muted'
      }`}
    >
      <Icon className="h-5 w-5" />
      {shortLabel ?? label}
    </button>
  )
}

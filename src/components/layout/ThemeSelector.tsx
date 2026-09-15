import { Flower2, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useTheme, type ThemeName } from '../../hooks/useTheme'

const OPTIONS: Array<{ value: ThemeName; label: string; icon: LucideIcon }> = [
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'rose', label: 'Rosa', icon: Flower2 },
]

/** Botones pequeños para elegir el tema visual (Oscuro/Claro/Rosa), en tiempo real. */
export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 rounded-lg border border-line bg-app p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-label={label}
          title={label}
          className={`flex items-center justify-center rounded-md p-1.5 transition-colors ${
            theme === value ? 'bg-accent text-on-accent' : 'text-muted hover:bg-line hover:text-ink-soft'
          }`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}

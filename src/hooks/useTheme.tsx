import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemeName = 'dark' | 'light' | 'rose'

const THEME_STORAGE_KEY = 'admpersonal:theme'
const DEFAULT_THEME: ThemeName = 'dark'

function isThemeName(value: string | null): value is ThemeName {
  return value === 'dark' || value === 'light' || value === 'rose'
}

interface ThemeContextValue {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Tema visual activo (dark/light/rose), persistido en `localStorage`.
 * Aplica `data-theme` al elemento raíz — de ahí toman su valor todas las
 * variables CSS de `index.css` (`--color-app`, `--color-accent`, etc.), así
 * que cambiar el tema no re-renderiza nada por fuera de este Provider: es
 * pura cascada de CSS.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
      return isThemeName(stored) ? stored : DEFAULT_THEME
    } catch {
      return DEFAULT_THEME
    }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Sin localStorage disponible: el tema sigue funcionando, solo no persiste.
    }
  }, [theme])

  const setTheme = useCallback((next: ThemeName) => setThemeState(next), [])

  const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme }), [theme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un <ThemeProvider>')
  }
  return context
}

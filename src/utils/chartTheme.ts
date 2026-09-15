import type { ThemeName } from '../hooks/useTheme'

/**
 * Colores "de chrome" para Recharts (grilla, ejes, tooltip) por tema.
 * Recharts pinta en SVG y necesita valores de color literales — no puede
 * leer `var(--color-*)` de forma confiable en todos sus props, así que este
 * mapa duplica a mano los mismos tonos que `index.css` define por tema.
 *
 * Los colores de las series (ingresos/gastos, fijo/flexible) son semánticos
 * y NO están acá — se mantienen iguales en los tres temas a propósito.
 */
export interface ChartPalette {
  grid: string
  axis: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
}

export const CHART_PALETTES: Record<ThemeName, ChartPalette> = {
  dark: {
    grid: '#1e293b',
    axis: '#94a3b8',
    tooltipBg: '#0f172a',
    tooltipBorder: '#1e293b',
    tooltipText: '#e2e8f0',
  },
  light: {
    grid: '#e2e8f0',
    axis: '#64748b',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e2e8f0',
    tooltipText: '#0f172a',
  },
  rose: {
    grid: '#fbcfe8',
    axis: '#be185d',
    tooltipBg: '#fffbfd',
    tooltipBorder: '#fbcfe8',
    tooltipText: '#500724',
  },
}

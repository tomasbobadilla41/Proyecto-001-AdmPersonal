import type { ThemeName } from '../hooks/useTheme'

/**
 * Colores para Recharts por tema. Recharts pinta en SVG y necesita valores de
 * color literales — no puede leer `var(--color-*)` de forma confiable en
 * todos sus props, así que este mapa duplica a mano los mismos tonos que
 * `index.css` define por tema. Si cambiás uno, cambiá el otro.
 *
 * Incluye los colores semánticos de las series (ingresos/gastos,
 * fijo/flexible): el significado es el mismo en todos los temas, pero el tono
 * se ajusta para tener contraste sobre el fondo de cada uno.
 */
export interface ChartPalette {
  grid: string
  axis: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
  positive: string
  negative: string
  fijos: string
  flexibles: string
}

export const CHART_PALETTES: Record<ThemeName, ChartPalette> = {
  dark: {
    grid: '#26262a',
    axis: '#a1a1aa',
    tooltipBg: '#141416',
    tooltipBorder: '#26262a',
    tooltipText: '#fafafa',
    positive: '#34d399',
    negative: '#fb7185',
    fijos: '#818cf8',
    flexibles: '#fdba74',
  },
  light: {
    grid: '#e4e4e7',
    axis: '#71717a',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e4e4e7',
    tooltipText: '#18181b',
    positive: '#047857',
    negative: '#e11d48',
    fijos: '#5b5bd6',
    flexibles: '#c2410c',
  },
  rose: {
    grid: '#f2d3df',
    axis: '#87596b',
    tooltipBg: '#fffafc',
    tooltipBorder: '#f2d3df',
    tooltipText: '#2b1720',
    positive: '#047857',
    negative: '#b91c1c',
    fijos: '#7c3aed',
    flexibles: '#c2410c',
  },
}

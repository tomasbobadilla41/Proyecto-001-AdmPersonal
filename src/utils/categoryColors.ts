import type { ExpenseCategory } from '../types/finance'

interface CategoryColor {
  /** Color sólido (hex) de la categoría: porción del gráfico de torta y punto
   *  del badge. El texto del badge queda neutro a propósito — 17 colores de
   *  texto distintos en una tabla son ruido visual y no se leen en tema claro. */
  chartColor: string
}

export const CATEGORY_COLORS: Record<ExpenseCategory, CategoryColor> = {
  // FIJO
  Alquiler: { chartColor: '#818cf8' },
  Expensas: { chartColor: '#a78bfa' },
  'Obra Social': { chartColor: '#38bdf8' },
  ABL: { chartColor: '#a3e635' },
  Edenor: { chartColor: '#facc15' },
  Metrogas: { chartColor: '#fb923c' },
  'Internet/Teléfono': { chartColor: '#22d3ee' },
  'Seguro Auto': { chartColor: '#f87171' },
  Patente: { chartColor: '#a8a29e' },
  Gimnasio: { chartColor: '#2dd4bf' },
  'Streaming (Netflix, YT)': { chartColor: '#f472b6' },
  // FLEXIBLE
  Supermercado: { chartColor: '#60a5fa' },
  'Cenas/Salidas': { chartColor: '#e879f9' },
  Compras: { chartColor: '#c084fc' },
  Nafta: { chartColor: '#fbbf24' },
  'Tarjeta de Crédito': { chartColor: '#4ade80' },
  Otros: { chartColor: '#a1a1aa' },
}

export const ALL_CATEGORIES = Object.keys(CATEGORY_COLORS) as ExpenseCategory[]

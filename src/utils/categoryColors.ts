import type { ExpenseCategory } from '../types/finance'

interface CategoryColor {
  /** Clases Tailwind para el badge (fondo translúcido + texto). Literales a
   *  propósito: Tailwind no genera clases a partir de strings interpolados. */
  badgeClassName: string
  /** Color sólido (hex) para el gráfico de torta, mismo tono que el texto del badge. */
  chartColor: string
}

export const CATEGORY_COLORS: Record<ExpenseCategory, CategoryColor> = {
  // FIJO
  Alquiler: { badgeClassName: 'bg-indigo-500/10 text-indigo-400', chartColor: '#818cf8' },
  Expensas: { badgeClassName: 'bg-violet-500/10 text-violet-400', chartColor: '#a78bfa' },
  'Obra Social': { badgeClassName: 'bg-sky-500/10 text-sky-400', chartColor: '#38bdf8' },
  ABL: { badgeClassName: 'bg-lime-500/10 text-lime-400', chartColor: '#a3e635' },
  Edenor: { badgeClassName: 'bg-yellow-500/10 text-yellow-400', chartColor: '#facc15' },
  Metrogas: { badgeClassName: 'bg-orange-500/10 text-orange-400', chartColor: '#fb923c' },
  'Internet/Teléfono': { badgeClassName: 'bg-cyan-500/10 text-cyan-400', chartColor: '#22d3ee' },
  'Seguro Auto': { badgeClassName: 'bg-red-500/10 text-red-400', chartColor: '#f87171' },
  Patente: { badgeClassName: 'bg-stone-500/10 text-stone-400', chartColor: '#a8a29e' },
  Gimnasio: { badgeClassName: 'bg-teal-500/10 text-teal-400', chartColor: '#2dd4bf' },
  'Streaming (Netflix, YT)': { badgeClassName: 'bg-pink-500/10 text-pink-400', chartColor: '#f472b6' },
  // FLEXIBLE
  Supermercado: { badgeClassName: 'bg-blue-500/10 text-blue-400', chartColor: '#60a5fa' },
  'Cenas/Salidas': { badgeClassName: 'bg-fuchsia-500/10 text-fuchsia-400', chartColor: '#e879f9' },
  Compras: { badgeClassName: 'bg-purple-500/10 text-purple-400', chartColor: '#c084fc' },
  Nafta: { badgeClassName: 'bg-amber-500/10 text-amber-400', chartColor: '#fbbf24' },
  'Tarjeta de Crédito': { badgeClassName: 'bg-green-500/10 text-green-400', chartColor: '#4ade80' },
  Otros: { badgeClassName: 'bg-zinc-500/10 text-zinc-400', chartColor: '#a1a1aa' },
}

export const ALL_CATEGORIES = Object.keys(CATEGORY_COLORS) as ExpenseCategory[]

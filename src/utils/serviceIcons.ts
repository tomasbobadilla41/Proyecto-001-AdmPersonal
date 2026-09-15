import {
  Building2,
  Car,
  Dumbbell,
  Flame,
  HeartPulse,
  Home,
  Landmark,
  ShieldCheck,
  Tv,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { FixedExpenseCategory } from '../types/finance'

/** Ícono representativo de cada subcategoría de Gastos Fijos, para el Centro de Pagos. */
export const FIXED_CATEGORY_ICONS: Record<FixedExpenseCategory, LucideIcon> = {
  Alquiler: Home,
  Expensas: Building2,
  'Obra Social': HeartPulse,
  ABL: Landmark,
  Edenor: Zap,
  Metrogas: Flame,
  'Internet/Teléfono': Wifi,
  'Seguro Auto': ShieldCheck,
  Patente: Car,
  Gimnasio: Dumbbell,
  'Streaming (Netflix, YT)': Tv,
}

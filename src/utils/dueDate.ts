/**
 * Estado de vencimiento de un servicio PENDIENTE en el mes en curso, a partir
 * de su `dueDay` (día del mes, 1-31).
 */
export type DueStatus =
  | { kind: 'none' }
  | { kind: 'overdue'; day: number }
  | { kind: 'soon'; day: number; daysLeft: number }
  | { kind: 'later'; day: number }

/** Días que se consideran "por vencer" (se resaltan como alerta). */
const SOON_THRESHOLD_DAYS = 3

/**
 * Día de vencimiento efectivo en el mes de `today`: un `dueDay` 31 en un mes
 * de 30 días vence el 30 (último día), no "nunca".
 */
export function effectiveDueDay(dueDay: number, today: Date): number {
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  return Math.min(dueDay, lastDayOfMonth)
}

export function getDueStatus(dueDay: number | undefined, today: Date = new Date()): DueStatus {
  if (!dueDay) return { kind: 'none' }

  const day = effectiveDueDay(dueDay, today)
  const daysLeft = day - today.getDate()

  if (daysLeft < 0) return { kind: 'overdue', day }
  if (daysLeft <= SOON_THRESHOLD_DAYS) return { kind: 'soon', day, daysLeft }
  return { kind: 'later', day }
}

/** Texto corto para mostrar junto al servicio: "Vencido el 10", "Vence hoy", "Vence en 2 días", "Vence el 15". */
export function formatDueStatus(status: DueStatus): string {
  switch (status.kind) {
    case 'none':
      return 'Sin vencimiento'
    case 'overdue':
      return `Vencido el ${status.day}`
    case 'soon':
      if (status.daysLeft === 0) return 'Vence hoy'
      if (status.daysLeft === 1) return 'Vence mañana'
      return `Vence en ${status.daysLeft} días`
    case 'later':
      return `Vence el ${status.day}`
  }
}

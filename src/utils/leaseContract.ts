import type { LeaseContract } from '../types/realEstate'

interface DateParts {
  year: number
  month: number
}

/** Parsea un 'YYYY-MM-DD' con getters UTC (mismo criterio que el resto de la app). */
function parseISODateParts(iso: string): DateParts {
  const date = new Date(iso)
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 }
}

/** Índice absoluto de un mes/año, para poder restar dos períodos directamente. */
function monthIndex({ year, month }: DateParts): number {
  return year * 12 + month
}

/** El contrato de esa propiedad vigente para el mes/año dado (si existe). */
export function getActiveContract(
  contracts: LeaseContract[],
  propertyId: string,
  month: number,
  year: number,
): LeaseContract | undefined {
  const targetIndex = monthIndex({ year, month })

  return contracts.find((contract) => {
    if (contract.propertyId !== propertyId) return false
    const startIndex = monthIndex(parseISODateParts(contract.startDate))
    const endIndex = monthIndex(parseISODateParts(contract.endDate))
    return targetIndex >= startIndex && targetIndex <= endIndex
  })
}

export interface ContractProgress {
  /** Mes del contrato en curso, 1-based (el mes de `startDate` es el mes 1). */
  elapsedMonths: number
  totalMonths: number
  /** 0-100. */
  percentage: number
}

/** Cuánto del contrato transcurrió hasta el mes/año dado, clampeado a [1, totalMonths]. */
export function getContractProgress(contract: LeaseContract, month: number, year: number): ContractProgress {
  const start = parseISODateParts(contract.startDate)
  const end = parseISODateParts(contract.endDate)
  const totalMonths = Math.max(1, monthIndex(end) - monthIndex(start) + 1)
  const rawElapsed = monthIndex({ year, month }) - monthIndex(start) + 1
  const elapsedMonths = Math.min(Math.max(rawElapsed, 1), totalMonths)

  return { elapsedMonths, totalMonths, percentage: (elapsedMonths / totalMonths) * 100 }
}

/**
 * Si el mes/año dado corresponde a una actualización de alquiler, contando
 * `updateFrequencyMonths` desde `startDate`. El mes de inicio (mes 1) es el
 * precio pactado, todavía sin actualizar; la primera actualización cae en el
 * mes `updateFrequencyMonths + 1`, y se repite cada `updateFrequencyMonths`
 * meses desde ahí (ej: frecuencia 3 → actualiza en los meses 4, 7, 10...).
 */
export function isIncreaseMonth(contract: LeaseContract, month: number, year: number): boolean {
  if (contract.updateFrequencyMonths <= 0) return false
  const { elapsedMonths } = getContractProgress(contract, month, year)
  if (elapsedMonths <= 1) return false
  return (elapsedMonths - 1) % contract.updateFrequencyMonths === 0
}

/**
 * Nuevo alquiler = monto actual × (índice actual / índice base). A diferencia
 * de anclar siempre al valor de firma, acá los dos índices se ingresan a
 * mano cada vez — "índice base" se entiende como el valor del mes anterior
 * al inicio del contrato o al último aumento aplicado (lo que corresponda),
 * así que compone correctamente sobre actualizaciones sucesivas.
 */
export function calculateRentUpdate(currentAmount: number, baseIndex: number, currentIndex: number): number | null {
  if (!currentAmount || currentAmount <= 0) return null
  if (!baseIndex || baseIndex <= 0) return null
  if (!currentIndex || currentIndex <= 0) return null
  return currentAmount * (currentIndex / baseIndex)
}

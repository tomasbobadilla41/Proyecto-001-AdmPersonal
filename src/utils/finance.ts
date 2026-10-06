import type { Currency } from '../types/money'
import type { Expense, ExchangeRate, Income, MonthlySummary } from '../types/finance'

export const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
] as const

export const MESES_LARGOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const

/** Cotización ARS/USD que se usa si el usuario todavía no cargó una para ese mes. */
export const TIPO_CAMBIO_POR_DEFECTO = 1450

/** Cotización cargada para ese mes/año, o `TIPO_CAMBIO_POR_DEFECTO` si no hay ninguna. */
export function getExchangeRate(exchangeRates: ExchangeRate[], mes: number, anio: number): number {
  const rate = exchangeRates.find((r) => r.mes === mes && r.anio === anio)
  return rate?.valor ?? TIPO_CAMBIO_POR_DEFECTO
}

/** Convierte un monto a ARS usando un tipo de cambio estimado (no-op si ya está en ARS). */
export function toARS(amount: number, currency: Currency, tipoCambio: number): number {
  return currency === 'USD' ? amount * tipoCambio : amount
}

/**
 * Calcula el `MonthlySummary` de un período (mes/año) a partir de los `Income`
 * y `Expense` crudos, convirtiendo todo a ARS con `tipoCambio`.
 *
 * Nota: las fechas de `Expense` se comparan en UTC porque se construyen desde
 * strings ISO ('YYYY-MM-DD'), que `Date` interpreta en UTC — usar los getters
 * locales (`getMonth`/`getFullYear`) correría el día/mes en husos horarios
 * negativos como el de Argentina.
 */
export function calculateMonthlySummary(
  mes: number,
  anio: number,
  incomes: Income[],
  expenses: Expense[],
  tipoCambio: number,
): MonthlySummary {
  const income = incomes.find((i) => i.mes === mes && i.anio === anio)
  const ingresosTotalesARS = income
    ? income.sueldoARS + toARS(income.sueldoUSD, 'USD', tipoCambio)
    : 0

  const gastosTotales = expenses
    .filter((e) => e.fecha.getUTCMonth() + 1 === mes && e.fecha.getUTCFullYear() === anio)
    .reduce((total, e) => total + toARS(e.monto, e.moneda, tipoCambio), 0)

  const remanenteAhorro = ingresosTotalesARS - gastosTotales
  const porcentajeFijo = ingresosTotalesARS > 0 ? gastosTotales / ingresosTotalesARS : 0

  return {
    mes,
    anio,
    ingresosTotalesARS,
    gastosTotales,
    remanenteAhorro,
    porcentajeFijo,
    tipoCambioUsado: tipoCambio,
  }
}

/**
 * Calcula varios resúmenes mensuales, uno por período, en el orden recibido.
 * `getTipoCambio` permite que cada período use su propia cotización (la que
 * el usuario haya cargado para ese mes puntual, vía `getExchangeRate`).
 */
export function calculateMonthlySummaries(
  periodos: Array<{ mes: number; anio: number }>,
  incomes: Income[],
  expenses: Expense[],
  getTipoCambio: (mes: number, anio: number) => number,
): MonthlySummary[] {
  return periodos.map(({ mes, anio }) =>
    calculateMonthlySummary(mes, anio, incomes, expenses, getTipoCambio(mes, anio)),
  )
}

/**
 * Los últimos `count` períodos calendario terminando en `referenceDate` (por
 * defecto, hoy), en orden cronológico ascendente. A diferencia de una versión
 * basada en los datos cargados, esto no depende de que exista Income/Expense
 * para esos meses — con la app recién iniciada (sin datos) igual arma los
 * últimos N meses, todos en cero, en vez de devolver una lista vacía.
 */
export function getTrailingPeriods(
  count: number,
  referenceDate: Date = new Date(),
): Array<{ mes: number; anio: number }> {
  const periods: Array<{ mes: number; anio: number }> = []
  let anio = referenceDate.getFullYear()
  let mes = referenceDate.getMonth() + 1

  for (let i = 0; i < count; i++) {
    periods.unshift({ mes, anio })
    mes -= 1
    if (mes === 0) {
      mes = 12
      anio -= 1
    }
  }

  return periods
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

/** Formatea una fecha en dd/mm/aaaa usando getters UTC (ver nota arriba). */
export function formatDateAR(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${date.getUTCFullYear()}`
}

/** Años con al menos un gasto cargado, más el año calendario actual, desc. */
export function getAvailableYears(expenses: Expense[]): number[] {
  const years = new Set(expenses.map((e) => e.fecha.getUTCFullYear()))
  years.add(new Date().getFullYear())
  return Array.from(years).sort((a, b) => b - a)
}

/**
 * Fecha de hoy en formato 'YYYY-MM-DD' (para precargar un `<input type="date">`).
 * Usa getters locales a propósito: el usuario piensa en su día calendario local,
 * no en UTC. Ese string, al guardarse como `new Date(valor)`, vuelve a
 * interpretarse en UTC — coherente con el resto de las fechas de la app.
 */
export function todayISODate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * `fecha` en formato 'YYYY-MM-DD' usando getters UTC (coherente con cómo se
 * interpretan las fechas en toda la app — ver `todayISODate`). Para mandarle
 * la columna `date` a Supabase.
 */
export function toDateOnlyUTC(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Suma `months` meses a una fecha en UTC, cambiando de año si corresponde
 * (API nativa de `Date`, sin `date-fns`: `Date.UTC` normaliza un mes fuera
 * de [0,11] corriendo el año solo). Si el día no existe en el mes de
 * destino (ej: 31 de enero + 1 mes → febrero no tiene 31), cae al último
 * día real de ese mes, igual que `date-fns`.
 */
export function addMonthsUTC(date: Date, months: number): Date {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()

  const targetMonthStart = new Date(Date.UTC(year, month + months, 1))
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month + months + 1, 0)).getUTCDate()

  return new Date(
    Date.UTC(targetMonthStart.getUTCFullYear(), targetMonthStart.getUTCMonth(), Math.min(day, lastDayOfTargetMonth)),
  )
}

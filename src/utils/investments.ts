import type { InvestmentPosition, InvestmentType } from '../types/finance'
import { toARS } from './finance'

export const ALL_INVESTMENT_TYPES: InvestmentType[] = ['CEDEAR', 'MEP', 'Crypto', 'ON', 'FCI']

/** Valor actual de la posición, en su propia moneda (precioActual * cantidad). */
export function getPositionValue(position: InvestmentPosition): number {
  return position.precioActual * position.cantidad
}

/** Costo de la posición, en su propia moneda (precioCompraPromedio * cantidad). */
export function getPositionCost(position: InvestmentPosition): number {
  return position.precioCompraPromedio * position.cantidad
}

/** Ganancia/pérdida de una posición: monto (en su moneda) y porcentaje. */
export function getPositionResult(position: InvestmentPosition): { monto: number; porcentaje: number } {
  const monto = getPositionValue(position) - getPositionCost(position)
  const porcentaje =
    position.precioCompraPromedio > 0
      ? (position.precioActual - position.precioCompraPromedio) / position.precioCompraPromedio
      : 0

  return { monto, porcentaje }
}

export interface PortfolioTotals {
  /** Valor de mercado de toda la cartera, estandarizado a ARS. */
  valorTotalARS: number
  /** Costo de toda la cartera, estandarizado a ARS. */
  costoTotalARS: number
  /** Ganancia/pérdida total de la cartera, estandarizado a ARS. */
  resultadoTotalARS: number
}

/** Totaliza la cartera convirtiendo cada posición a ARS con `tipoCambio`. */
export function calculatePortfolioTotals(
  positions: InvestmentPosition[],
  tipoCambio: number,
): PortfolioTotals {
  return positions.reduce<PortfolioTotals>(
    (totals, position) => {
      const valorARS = toARS(getPositionValue(position), position.moneda, tipoCambio)
      const costoARS = toARS(getPositionCost(position), position.moneda, tipoCambio)

      return {
        valorTotalARS: totals.valorTotalARS + valorARS,
        costoTotalARS: totals.costoTotalARS + costoARS,
        resultadoTotalARS: totals.resultadoTotalARS + (valorARS - costoARS),
      }
    },
    { valorTotalARS: 0, costoTotalARS: 0, resultadoTotalARS: 0 },
  )
}

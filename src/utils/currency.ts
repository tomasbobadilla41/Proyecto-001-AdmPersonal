import type { Currency, Money } from '../types/money'

const LOCALE_BY_CURRENCY: Record<Currency, string> = {
  ARS: 'es-AR',
  USD: 'en-US',
}

export function formatMoney({ amount, currency }: Money): string {
  return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Formatea un monto en USD con separadores es-AR (punto de miles, coma
 * decimal) mostrando el código "USD" en vez del símbolo "$" — para usar en
 * equivalencias (ej: "≈ USD 1.013,51") sin que se confunda con pesos.
 */
export function formatUsdEquivalent(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'code',
  }).format(amount)
}

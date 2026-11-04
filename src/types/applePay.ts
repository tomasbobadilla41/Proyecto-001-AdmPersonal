import type { Money } from './money'

/** Una llamada del Shortcut de iOS al endpoint `log-apple-pay-expense`. */
export interface ApplePayRequest {
  id: string
  receivedAt: string
  /** Código HTTP con el que respondió la función (200, 400, 401, 500). */
  status: number
  /** Body tal cual llegó; `null` en los 401 (no se guarda por seguridad). */
  payload: unknown
  /** Monto interpretado, siempre en ARS (es lo que inserta la función). */
  parsedAmount: Money | null
  error: string | null
  expenseId: string | null
}

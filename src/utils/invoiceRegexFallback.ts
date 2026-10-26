import { parseArgentineAmount } from './finance'

export interface RegexInvoiceData {
  monto_total: number
  numero_cliente: string
  categoria_sugerida: string
}

interface ProviderPattern {
  categoria_sugerida: string
  /** Si el texto de la factura matchea esto, se asume que es de este proveedor. */
  detect: RegExp
  /** Debe tener un grupo de captura con el monto, en formato argentino ("30.528,06"). */
  amount: RegExp
  /** Debe tener un grupo de captura con el número de cliente/cuenta. Opcional — si no matchea, igual sirve el monto. */
  accountNumber?: RegExp
}

/**
 * Patrones fijos por proveedor conocido — última red de seguridad para
 * cuando Gemini no responde (cuota agotada, caído, etc.). Solo cubre a los
 * proveedores cuyo formato de factura ya se vio y probó; para cualquier otro
 * no matchea nada (`extractInvoiceWithRegex` devuelve `null`) y ahí sí hace
 * falta Gemini o carga manual. Agregar un proveedor nuevo acá es solo sumar
 * una entrada con sus propios patrones.
 */
const PROVIDER_PATTERNS: ProviderPattern[] = [
  {
    categoria_sugerida: 'Edenor',
    detect: /edenor/i,
    amount: /TOTAL A PAGAR[\s\S]{0,60}?\$\s*([\d.,]+)/i,
    accountNumber: /Cuenta\s+([\d\s]{8,20})/i,
  },
  {
    categoria_sugerida: 'Metrogas',
    detect: /metrogas/i,
    amount: /TOTAL A PAGAR[\s\S]{0,60}?\$\s*([\d.,]+)/i,
    accountNumber: /N[uú]mero de cliente[\s\S]{0,80}?(\d{8,20})/i,
  },
]

/** Extrae monto/cliente/categoría del texto de una factura con patrones fijos, sin IA. `null` si no reconoce al proveedor o no encuentra el monto. */
export function extractInvoiceWithRegex(text: string): RegexInvoiceData | null {
  const provider = PROVIDER_PATTERNS.find((p) => p.detect.test(text))
  if (!provider) return null

  const amountMatch = text.match(provider.amount)
  if (!amountMatch) return null

  const monto_total = parseArgentineAmount(amountMatch[1])
  if (!monto_total) return null

  const accountMatch = provider.accountNumber ? text.match(provider.accountNumber) : null

  return {
    monto_total,
    numero_cliente: accountMatch?.[1]?.trim() ?? '',
    categoria_sugerida: provider.categoria_sugerida,
  }
}

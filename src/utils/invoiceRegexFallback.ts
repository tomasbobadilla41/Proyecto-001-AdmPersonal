import type { FixedExpenseCategory } from '../types/finance'
import { parseArgentineAmount } from './finance'

export interface RegexInvoiceData {
  monto_total: number
  numero_cliente: string
  categoria_sugerida: FixedExpenseCategory
}

interface ProviderPattern {
  categoria_sugerida: FixedExpenseCategory
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
  {
    // Liquidación de expensas de S.I.P.A.C. (admin "ADMINISTRACION DEL
    // CARMEN"): es una tabla con una fila por unidad del consorcio, no un
    // monto único — el `amount` ancla en el apellido del usuario y el
    // código de su unidad para no agarrar el total de TODO el edificio por
    // error (¡21x más grande que el monto real!). Es la única entrada acá
    // atada a un dato personal en vez del nombre del proveedor — si cambia
    // de unidad o de administración, este patrón deja de reconocer el PDF.
    categoria_sugerida: 'Expensas',
    detect: /ESTADO DE CUENTAS Y PRORRATEO|S\.I\.P\.A\.C\./i,
    amount: /BOBADILLA[\s\S]*?(-?[\d.]+,\d{2})\s+011\b/i,
  },
]

/**
 * Extrae monto/cliente/categoría del texto de una factura con patrones fijos, sin IA. `null` si ningún proveedor
 * reconoce el texto. Prueba cada proveedor cuyo `detect` matchea, en orden — si su `amount` no encuentra nada (por
 * ej. porque el texto solo lo nombra de paso, como "Edenor" dentro del detalle de proveedores de una liquidación de
 * expensas) sigue probando el resto en vez de rendirse ahí.
 */
export function extractInvoiceWithRegex(text: string): RegexInvoiceData | null {
  for (const provider of PROVIDER_PATTERNS) {
    if (!provider.detect.test(text)) continue

    const amountMatch = text.match(provider.amount)
    if (!amountMatch) continue

    const monto_total = parseArgentineAmount(amountMatch[1])
    if (!monto_total) continue

    const accountMatch = provider.accountNumber ? text.match(provider.accountNumber) : null

    return {
      monto_total,
      numero_cliente: accountMatch?.[1]?.trim() ?? '',
      categoria_sugerida: provider.categoria_sugerida,
    }
  }

  return null
}

import { parseArgentineAmount } from './finance'

export interface RegexPayslipData {
  sueldoNeto: number
  horasExtras: {
    detectadas: boolean
    cantidadHoras?: number
    monto?: number
  }
  descuentoGimnasio?: number
}

// Patrones fijos contra el formato del recibo de liquidación de sueldos
// (software "Customer Report" de PARSIMOTION, el que emite el empleador).
// Como siempre es el mismo empleador y el mismo software, no hace falta IA
// — a diferencia de las facturas de servicios, que vienen de proveedores
// distintos con formatos distintos entre sí.
const SUELDO_NETO_PATTERN = /SUELDO NETO[\s\S]{0,15}?\$\s*(-?[\d.,]+)/i
// "HORAS EXTRAS 50%   2   $ 26.813,13" — el % es opcional (puede variar: 50%, 100%, etc).
const HORAS_EXTRAS_PATTERN = /HORAS EXTRAS\s*\d*%?\s*(\d+)\s*\$\s*(-?[\d.,]+)/i
const HORAS_EXTRAS_DETECT_PATTERN = /HORAS EXTRAS/i
// "GIMNASIO   $ -3.500,00"
const GIMNASIO_PATTERN = /GIMNASIO\s*\$\s*(-?[\d.,]+)/i

/**
 * Extrae sueldo neto, horas extra y descuento de gimnasio del texto de un
 * recibo de sueldo, sin IA. `null` si no encuentra el sueldo neto (dato
 * obligatorio) — ahí sí hace falta cargar el monto a mano.
 */
export function extractPayslipWithRegex(text: string): RegexPayslipData | null {
  const sueldoMatch = text.match(SUELDO_NETO_PATTERN)
  if (!sueldoMatch) return null

  const sueldoNeto = parseArgentineAmount(sueldoMatch[1])
  if (!sueldoNeto) return null

  const horasMatch = text.match(HORAS_EXTRAS_PATTERN)
  const horasDetectadas = horasMatch !== null || HORAS_EXTRAS_DETECT_PATTERN.test(text)

  const gimnasioMatch = text.match(GIMNASIO_PATTERN)

  return {
    sueldoNeto,
    horasExtras: {
      detectadas: horasDetectadas,
      // Si matchea el patrón completo (con cantidad y monto) los informa;
      // si solo detecta la palabra "HORAS EXTRAS" sin poder leer los
      // números (formato distinto al esperado), igual avisa sin el detalle.
      cantidadHoras: horasMatch ? Number(horasMatch[1]) : undefined,
      monto: horasMatch ? parseArgentineAmount(horasMatch[2]) : undefined,
    },
    descuentoGimnasio: gimnasioMatch ? Math.abs(parseArgentineAmount(gimnasioMatch[1])) : undefined,
  }
}

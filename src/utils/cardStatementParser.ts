import { MESES_CORTOS, parseArgentineAmount } from './finance'

export interface CardStatementItem {
  fecha: Date
  /** Nombre del comercio, sin el sufijo "(Cuota X/Y)" — eso se arma recién al confirmar la carga. */
  descripcion: string
  monto: number
  cuotaActual?: number
  cuotaTotal?: number
}

export interface ParsedCardStatement {
  items: CardStatementItem[]
  /** "TOTAL CONSUMOS" en pesos, tal como lo declara el propio resumen — para verificar contra la suma de `items`. */
  totalDeclarado: number
  cierre?: Date
  vencimiento?: Date
}

// Aísla la tabla de consumos ("Consumos <titular> FECHA DESCRIPCIÓN NRO. CUPÓN PESOS
// DÓLARES <filas> TOTAL CONSUMOS ... <total pesos> <total dólares>"). El gap inicial
// está acotado a pocos caracteres a propósito: la palabra "consumos" también aparece
// suelta más arriba, en el resumen de saldos ("TOTAL CONSUMOS DE ..."), y un gap sin
// límite termina enganchando esa aparición y arrastrando la fila de pago anterior
// ("SU PAGO EN PESOS") como si fuera un consumo.
const BLOCK_RE =
  /Consumos[^]{0,60}?FECHA\s+DESCRIPCIÓN\s+NRO\.\s*CUPÓN\s+PESOS\s+DÓLARES\s+([\s\S]*?)\s*TOTAL CONSUMOS[^]*?([\d.]+,\d{2})\s+([\d.,]+)/i

const ROW_RE =
  /(\d{2}-[A-Za-zÁÉÍÓÚñÑ]{3}-\d{2})\s+(.+?)(?:\s+C\.(\d{1,2})\/(\d{1,2}))?\s+(\d{4,})\s+(-?[\d.]+,\d{2})\b/g

const CIERRE_RE = /CIERRE ACTUAL\s+(\d{2}-[A-Za-z]{3}-\d{2})/i
const VENCIMIENTO_RE = /VENCIMIENTO ACTUAL\s+(\d{2}-[A-Za-z]{3}-\d{2})/i

/** Convierte "DD-Mon-YY" (ej: "14-Jul-26") a `Date`, en UTC — igual que el resto de las fechas de la app. */
function parseStatementDate(raw: string): Date | null {
  const match = raw.match(/^(\d{2})-([A-Za-zÁÉÍÓÚñÑ]{3})-(\d{2})$/)
  if (!match) return null

  const [, dayStr, mesStr, yearStr] = match
  const monthIndex = MESES_CORTOS.findIndex((m) => m.toLowerCase() === mesStr.toLowerCase())
  if (monthIndex === -1) return null

  return new Date(Date.UTC(2000 + Number(yearStr), monthIndex, Number(dayStr)))
}

/**
 * Extrae los consumos individuales de un resumen de tarjeta (BBVA Visa, único formato
 * probado por ahora). `null` si no reconoce el formato o no encuentra ningún consumo —
 * a diferencia de `extractInvoiceWithRegex`, acá no hay respaldo por IA: una tabla con
 * varias filas es mucho más fácil de arruinar con una extracción adivinada que un monto
 * único, así que ante la duda se prefiere fallar visiblemente antes que inventar datos.
 */
export function parseCardStatement(text: string): ParsedCardStatement | null {
  const blockMatch = text.match(BLOCK_RE)
  if (!blockMatch) return null

  const [, rowsBlock, totalDeclaradoRaw] = blockMatch
  const totalDeclarado = parseArgentineAmount(totalDeclaradoRaw)

  const items: CardStatementItem[] = []
  for (const rowMatch of rowsBlock.matchAll(ROW_RE)) {
    const [, fechaRaw, descripcionRaw, cuotaActualRaw, cuotaTotalRaw, , montoRaw] = rowMatch
    const fecha = parseStatementDate(fechaRaw)
    const monto = parseArgentineAmount(montoRaw)
    // Un monto negativo es un pago o ajuste a favor, no una compra — no debería
    // aparecer en este bloque (el BLOCK_RE ya lo evita), pero se descarta igual por las dudas.
    if (!fecha || !monto || monto < 0) continue

    items.push({
      fecha,
      descripcion: descripcionRaw.trim(),
      monto,
      cuotaActual: cuotaActualRaw ? Number(cuotaActualRaw) : undefined,
      cuotaTotal: cuotaTotalRaw ? Number(cuotaTotalRaw) : undefined,
    })
  }

  if (items.length === 0) return null

  const cierreMatch = text.match(CIERRE_RE)
  const vencimientoMatch = text.match(VENCIMIENTO_RE)

  return {
    items,
    totalDeclarado,
    cierre: cierreMatch ? (parseStatementDate(cierreMatch[1]) ?? undefined) : undefined,
    vencimiento: vencimientoMatch ? (parseStatementDate(vencimientoMatch[1]) ?? undefined) : undefined,
  }
}

import { extractPdfText } from '../utils/pdfText'
import { extractPayslipWithRegex, type RegexPayslipData } from '../utils/payslipRegexParser'
import { MAX_PDF_SIZE_BYTES } from '../utils/pdfFile'

export type ParsedPayslip = RegexPayslipData

/**
 * Extrae sueldo neto, horas extra y descuento de gimnasio del PDF del
 * recibo de sueldo. Sin IA: a diferencia de las facturas de servicios (que
 * vienen de proveedores distintos con formatos distintos entre sí), el
 * recibo siempre es del mismo empleador con el mismo formato — un parser
 * por patrones fijos (`payslipRegexParser.ts`) es gratis, instantáneo y
 * más confiable que mandarlo a una IA cada vez.
 */
export async function parsePayslipPdf(file: File): Promise<ParsedPayslip> {
  if (file.type !== 'application/pdf') {
    throw new Error('Solo se admiten archivos PDF.')
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw new Error('El PDF supera el tamaño máximo permitido (10 MB).')
  }

  const text = await extractPdfText(file)
  const data = extractPayslipWithRegex(text)

  if (!data) {
    throw new Error('No se pudo leer el sueldo neto de este recibo. Cargalo a mano.')
  }

  return data
}

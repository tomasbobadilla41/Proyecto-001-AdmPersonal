import { supabase } from '../lib/supabase'
import { fileToBase64, MAX_PDF_SIZE_BYTES } from '../utils/pdfFile'

// Si la función tarda más que esto (red colgada, sesión vencida, lo que sea),
// se aborta y se muestra un error — nunca debe quedar esperando para siempre.
const INVOKE_TIMEOUT_MS = 25_000

export interface ParsedPayslip {
  sueldoNeto: number
  horasExtras: {
    detectadas: boolean
    cantidadHoras?: number
    monto?: number
  }
  descuentoGimnasio?: number
}

interface GeminiPayslipData {
  sueldo_neto: number
  horas_extras: {
    detectadas: boolean
    cantidad_horas?: number
    monto?: number
  }
  descuento_gimnasio?: number
}

/**
 * Manda un PDF de recibo de sueldo a Gemini (vía la Edge Function
 * `parse-payslip`) y devuelve el sueldo neto, si detectó horas extra, y el
 * descuento de gimnasio si el recibo lo trae. A diferencia de
 * `parseInvoicePdf`, no tiene fallback sin IA — el recibo siempre es del
 * mismo empleador con formato consistente, así que si Gemini falla se
 * propaga el error y se reintenta más tarde en vez de adivinar con regex.
 */
export async function parsePayslipPdf(file: File): Promise<ParsedPayslip> {
  if (file.type !== 'application/pdf') {
    throw new Error('Solo se admiten archivos PDF.')
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw new Error('El PDF supera el tamaño máximo permitido (10 MB).')
  }

  const pdfBase64 = await fileToBase64(file)
  const { data, error } = await supabase.functions.invoke<GeminiPayslipData>('parse-payslip', {
    body: { pdfBase64 },
    timeout: INVOKE_TIMEOUT_MS,
  })

  if (error || !data) {
    throw new Error('Error al leer el recibo con la IA.')
  }

  return {
    sueldoNeto: data.sueldo_neto,
    horasExtras: {
      detectadas: data.horas_extras.detectadas,
      cantidadHoras: data.horas_extras.cantidad_horas,
      monto: data.horas_extras.monto,
    },
    descuentoGimnasio: data.descuento_gimnasio,
  }
}

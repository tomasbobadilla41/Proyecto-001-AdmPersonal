import { supabase } from '../lib/supabase'
import { extractPdfText } from '../utils/pdfText'
import { extractInvoiceWithRegex } from '../utils/invoiceRegexFallback'
import { fileToBase64, MAX_PDF_SIZE_BYTES } from '../utils/pdfFile'

// La Edge Function puede tardar hasta ~63s en el peor caso (3 intentos a
// Gemini de 20s + los delays entre reintentos) antes de rendirse sola — este
// timeout tiene que ser mayor a eso para no cortar la espera antes que el
// propio servidor termine sus reintentos.
const INVOKE_TIMEOUT_MS = 70_000

export interface ParsedInvoice {
  monto_total: number
  numero_cliente: string
  categoria_sugerida: string
  /** De dónde salieron los datos: `'ia'` (Gemini) o `'regex'` (fallback sin IA, cuando Gemini no respondió). */
  source: 'ia' | 'regex'
}

/** Deja solo los dígitos (las facturas suelen formatear el nro. de cuenta con espacios/puntos: "0 151 791 868"). */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

interface GeminiInvoiceData {
  monto_total: number
  numero_cliente: string
  categoria_sugerida: string
}

/** Le pide a la Edge Function `parse-invoice` (Gemini) que lea la factura. Tira si Gemini falla (cuota, caído, etc.) o si la llamada se cuelga. */
async function parseWithGemini(file: File): Promise<GeminiInvoiceData> {
  const pdfBase64 = await fileToBase64(file)
  const { data, error } = await supabase.functions.invoke<GeminiInvoiceData>('parse-invoice', {
    body: { pdfBase64 },
    timeout: INVOKE_TIMEOUT_MS,
  })

  if (error || !data) {
    throw new Error('Error al leer factura con la IA.')
  }

  return data
}

/**
 * Extrae monto/cliente/categoría de un PDF de factura. Prueba primero sin
 * IA: extrae el texto del PDF en el navegador (`extractPdfText`) y lo
 * matchea contra patrones fijos por proveedor conocido
 * (`extractInvoiceWithRegex`) — gratis, instantáneo, 100% determinístico. Si
 * el proveedor todavía no tiene patrón escrito (factura nueva/desconocida),
 * recién ahí cae a Gemini (vía la Edge Function `parse-invoice`) como red de
 * seguridad genérica. La Edge Function reintenta sola ante un 503/429
 * transitorio, y el timeout acá es la última red de seguridad por si la
 * llamada entera se cuelga.
 */
export async function parseInvoicePdf(file: File): Promise<ParsedInvoice> {
  if (file.type !== 'application/pdf') {
    throw new Error('Solo se admiten archivos PDF.')
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw new Error('El PDF supera el tamaño máximo permitido (10 MB).')
  }

  const text = await extractPdfText(file).catch(() => null)
  const regexResult = text ? extractInvoiceWithRegex(text) : null
  if (regexResult) {
    return { ...regexResult, source: 'regex' }
  }

  const data = await parseWithGemini(file)
  return { ...data, source: 'ia' }
}

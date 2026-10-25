import { supabase } from '../lib/supabase'
import { extractPdfText } from '../utils/pdfText'
import { extractInvoiceWithRegex } from '../utils/invoiceRegexFallback'

// Si la función tarda más que esto (red colgada, sesión vencida, lo que sea),
// se aborta y se muestra un error — nunca debe quedar esperando para siempre.
const INVOKE_TIMEOUT_MS = 25_000

// Un PDF más pesado que esto puede colgar el navegador al pasarlo a Base64
// y agotar la memoria de la Edge Function. Mismo límite validado en el servidor.
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024

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

/** Lee el `File` como Base64 puro (sin el prefijo `data:application/pdf;base64,`). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
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
 * Manda un PDF de factura a Gemini (vía la Edge Function `parse-invoice`) y
 * devuelve los datos estructurados ya extraídos. La Edge Function reintenta
 * sola ante un 503/429 transitorio, y el timeout acá es la última red de
 * seguridad por si la llamada entera se cuelga.
 *
 * Si Gemini termina fallando igual (ej. se agotó la cuota diaria gratuita —
 * ahí reintentar no sirve de nada hasta que resetee), antes de rendirse
 * prueba un fallback sin IA: extrae el texto del PDF en el navegador
 * (`extractPdfText`) y busca el monto/cliente con patrones fijos por
 * proveedor conocido (`extractInvoiceWithRegex`). Solo cubre a los
 * proveedores que ya se vieron — para cualquier otro, el fallback no
 * encuentra nada y se propaga el error original de Gemini.
 */
export async function parseInvoicePdf(file: File): Promise<ParsedInvoice> {
  if (file.type !== 'application/pdf') {
    throw new Error('Solo se admiten archivos PDF.')
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw new Error('El PDF supera el tamaño máximo permitido (10 MB).')
  }

  try {
    const data = await parseWithGemini(file)
    return { ...data, source: 'ia' }
  } catch (geminiError) {
    const text = await extractPdfText(file).catch(() => null)
    const fallback = text ? extractInvoiceWithRegex(text) : null

    if (fallback) {
      return { ...fallback, source: 'regex' }
    }

    throw geminiError instanceof Error ? geminiError : new Error('Error al leer factura. Probá de nuevo en unos segundos.')
  }
}

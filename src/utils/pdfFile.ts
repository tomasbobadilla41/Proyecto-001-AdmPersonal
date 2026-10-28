// Un PDF más pesado que esto puede colgar el navegador al pasarlo a Base64
// y agotar la memoria de la Edge Function que lo procese. Mismo límite
// validado del lado del servidor en cada Edge Function que lee PDFs.
export const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024

/** Lee el `File` como Base64 puro (sin el prefijo `data:application/pdf;base64,`). */
export function fileToBase64(file: File): Promise<string> {
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

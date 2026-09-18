export interface InstallmentInfo {
  /** Descripción original sin el sufijo "(Cuota X/Y)". */
  productName: string
  /** Número de esta cuota (1-based). */
  current: number
  /** Cantidad total de cuotas. */
  total: number
}

// Coincide con el formato que genera ExpenseFormDrawer al cargar una compra
// en cuotas: "{descripción} (Cuota {i}/{N})".
const INSTALLMENT_PATTERN = /^(.*) \(Cuota (\d+)\/(\d+)\)$/

/** Si la descripción tiene el formato de una cuota, devuelve sus partes; si no, `null`. */
export function parseInstallmentInfo(descripcion: string): InstallmentInfo | null {
  const match = descripcion.match(INSTALLMENT_PATTERN)
  if (!match) return null

  const [, productName, current, total] = match
  return { productName, current: Number(current), total: Number(total) }
}

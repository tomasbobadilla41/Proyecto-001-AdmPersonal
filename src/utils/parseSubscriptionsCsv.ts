import Papa from 'papaparse'

export interface ParsedSubscriptionRow {
  title: string
  monto: number
}

/** Acepta '1234.56' (punto decimal) y '1.234,56' (miles + coma decimal) — mismo criterio que el import de gastos. */
function parseAmount(value: string): number | null {
  const trimmed = value.trim().replace(/\$|\s/g, '')
  if (!trimmed) return null

  const normalized =
    trimmed.includes(',') && !trimmed.includes('.') ? trimmed.replace(',', '.') : trimmed.replace(/,/g, '')

  const amount = Number(normalized)
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

/**
 * Parsea el CSV que exporta impuestito.com ("suscripciones guardadas"):
 * nombre de la suscripción y el total final en ARS (precio base + impuestos
 * ya calculados) — el resto de las columnas (moneda original, cotización,
 * método de pago) no hace falta para cargar el gasto.
 */
export function parseSubscriptionsCsv(file: File): Promise<ParsedSubscriptionRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (result) => {
        const rows: ParsedSubscriptionRow[] = []
        for (const row of result.data) {
          const title = row['Suscripción']?.trim()
          const monto = parseAmount(row['Total (ARS)'] ?? '')
          if (title && monto) rows.push({ title, monto })
        }
        resolve(rows)
      },
      error: (error: Error) => reject(error),
    })
  })
}

const DOLAR_API_URL = 'https://dolarapi.com/v1/dolares/oficial'

export interface DolarOficial {
  moneda: string
  casa: string
  nombre: string
  /** Precio al que la casa de cambio compra USD (paga en ARS). */
  compra: number
  /** Precio al que la casa de cambio vende USD — el que usa la app para estandarizar montos en USD a ARS. */
  venta: number
  fechaActualizacion: string
}

/**
 * Cotización oficial del dólar (https://dolarapi.com/v1/dolares/oficial),
 * misma fuente que usaba `=IMPORTJSONCompra(...)` en el Excel del usuario
 * (aunque la app toma "venta", no "compra" — ver `useDolarOficial`). La API
 * permite CORS abierto, así que se puede llamar directo desde el navegador.
 */
export async function fetchDolarOficial(): Promise<DolarOficial> {
  const response = await fetch(DOLAR_API_URL)
  if (!response.ok) {
    throw new Error(`dolarapi.com respondió ${response.status}`)
  }
  return (await response.json()) as DolarOficial
}

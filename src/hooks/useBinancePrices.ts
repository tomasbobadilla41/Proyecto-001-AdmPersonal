import { useEffect, useState } from 'react'
import { fetchBinancePrice } from '../services/binanceApi'

interface UseBinancePricesResult {
  /** Precio en vivo (USD) por ticker — solo incluye los que se pudieron resolver. */
  prices: Record<string, number>
  isLoading: boolean
  error: string | null
}

/**
 * Precios en vivo de una lista de tickers de cripto, vía Binance. Se vuelve
 * a consultar automáticamente cuando cambia el conjunto de tickers (ej: al
 * registrar una compra de una moneda nueva).
 */
export function useBinancePrices(tickers: string[]): UseBinancePricesResult {
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clave estable (string ordenado) en vez del array: evita releer en cada
  // render solo porque `tickers` llega como una referencia nueva.
  const tickersKey = [...new Set(tickers.map((t) => t.toUpperCase()))].sort().join(',')

  useEffect(() => {
    const uniqueTickers = tickersKey ? tickersKey.split(',') : []
    if (uniqueTickers.length === 0) {
      setPrices({})
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    // `allSettled`, no `all`: si un ticker falla (ej: Binance lo deslistó),
    // no queremos perder los precios de los demás que sí resolvieron.
    Promise.allSettled(uniqueTickers.map(async (ticker) => [ticker, await fetchBinancePrice(ticker)] as const))
      .then((results) => {
        if (cancelled) return
        const entries = results
          .filter((r): r is PromiseFulfilledResult<readonly [string, number]> => r.status === 'fulfilled')
          .map((r) => r.value)
        setPrices(Object.fromEntries(entries))
        if (entries.length < uniqueTickers.length) {
          setError('No se pudieron actualizar algunos precios en vivo de Binance.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tickersKey])

  return { prices, isLoading, error }
}

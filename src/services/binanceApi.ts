const BINANCE_TICKER_URL = 'https://api.binance.com/api/v3/ticker/price'

interface BinanceTickerPrice {
  symbol: string
  price: string
}

/**
 * Precio spot actual de `ticker` contra USDT (ej: 'BTC' → BTCUSDT), vía la
 * API pública de Binance (sin autenticación, CORS abierto).
 */
export async function fetchBinancePrice(ticker: string): Promise<number> {
  const symbol = `${ticker.toUpperCase()}USDT`
  try {
    const response = await fetch(`${BINANCE_TICKER_URL}?symbol=${symbol}`)
    if (!response.ok) throw new Error()
    const data = (await response.json()) as BinanceTickerPrice
    const price = Number(data.price)
    if (!price || price <= 0) throw new Error()
    return price
  } catch {
    // Binance no manda headers CORS en sus respuestas de error (ej: símbolo
    // inválido) — el navegador lo reporta como "Failed to fetch" igual que
    // un problema de red real, así que no se pueden distinguir acá.
    throw new Error(`No se encontró "${ticker.toUpperCase()}" en Binance. Verificá el ticker o tu conexión.`)
  }
}

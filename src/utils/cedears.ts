/** Los 30 CEDEARs más operados en BYMA (ticker + nombre de la empresa subyacente). */
export interface CedearListing {
  ticker: string
  name: string
}

export const CEDEAR_LISTINGS: CedearListing[] = [
  { ticker: 'AAPL', name: 'Apple Inc.' },
  { ticker: 'MSFT', name: 'Microsoft Corporation' },
  { ticker: 'GOOGL', name: 'Alphabet Inc. (Google)' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.' },
  { ticker: 'TSLA', name: 'Tesla Inc.' },
  { ticker: 'META', name: 'Meta Platforms Inc.' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation' },
  { ticker: 'NFLX', name: 'Netflix Inc.' },
  { ticker: 'DIS', name: 'The Walt Disney Company' },
  { ticker: 'KO', name: 'The Coca-Cola Company' },
  { ticker: 'PEP', name: 'PepsiCo Inc.' },
  { ticker: 'MELI', name: 'MercadoLibre Inc.' },
  { ticker: 'BABA', name: 'Alibaba Group' },
  { ticker: 'V', name: 'Visa Inc.' },
  { ticker: 'MA', name: 'Mastercard Inc.' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.' },
  { ticker: 'BAC', name: 'Bank of America Corp.' },
  { ticker: 'WMT', name: 'Walmart Inc.' },
  { ticker: 'PG', name: 'Procter & Gamble Co.' },
  { ticker: 'XOM', name: 'Exxon Mobil Corporation' },
  { ticker: 'PFE', name: 'Pfizer Inc.' },
  { ticker: 'JNJ', name: 'Johnson & Johnson' },
  { ticker: 'INTC', name: 'Intel Corporation' },
  { ticker: 'AMD', name: 'Advanced Micro Devices Inc.' },
  { ticker: 'PYPL', name: 'PayPal Holdings Inc.' },
  { ticker: 'SBUX', name: 'Starbucks Corporation' },
  { ticker: 'NKE', name: 'Nike Inc.' },
  { ticker: 'BA', name: 'The Boeing Company' },
  { ticker: 'GE', name: 'General Electric Company' },
  { ticker: 'UBER', name: 'Uber Technologies Inc.' },
]

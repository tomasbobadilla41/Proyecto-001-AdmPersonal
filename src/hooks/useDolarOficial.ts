import { useCallback, useState } from 'react'
import { fetchDolarOficial } from '../services/dolarApi'

interface UseDolarOficialResult {
  isLoading: boolean
  error: string | null
  /** Consulta la cotización oficial y devuelve el valor "venta", o `null` si falló. */
  refresh: () => Promise<number | null>
}

export function useDolarOficial(): UseDolarOficialResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { venta } = await fetchDolarOficial()
      return venta
    } catch {
      setError('No se pudo actualizar. Probá de nuevo o cargala a mano.')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { isLoading, error, refresh }
}

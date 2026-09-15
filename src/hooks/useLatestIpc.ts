import { useCallback, useState } from 'react'
import { fetchLatestIpc, type IpcDataPoint } from '../services/ipcApi'

interface UseLatestIpcResult {
  isLoading: boolean
  error: string | null
  /** Consulta el último IPC publicado. Devuelve `null` (nunca lanza) si falla. */
  refresh: () => Promise<IpcDataPoint | null>
}

export function useLatestIpc(): UseLatestIpcResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      return await fetchLatestIpc()
    } catch {
      setError('No se pudo obtener el IPC automáticamente. Ingresalo a mano.')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { isLoading, error, refresh }
}

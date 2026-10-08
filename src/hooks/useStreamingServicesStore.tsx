import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useAuth } from './useAuth'
import { fetchCustomStreamingServices, insertCustomStreamingService } from '../services/streamingServicesApi'

interface StreamingServicesStore {
  /** Servicios de streaming que el usuario agregó a mano (además de los precargados en DEFAULT_STREAMING_SERVICES). */
  customStreamingServices: string[]
  isLoading: boolean
  addStreamingService: (name: string) => Promise<boolean>
}

const StreamingServicesStoreContext = createContext<StreamingServicesStore | null>(null)

/**
 * Nombres de streaming personalizados del usuario activo, persistidos en
 * Supabase (tabla `custom_streaming_services`, con RLS por `user_id`).
 */
export function StreamingServicesStoreProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id

  const [customStreamingServices, setCustomStreamingServices] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setCustomStreamingServices([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    fetchCustomStreamingServices(userId)
      .then((data) => {
        if (!cancelled) setCustomStreamingServices(data)
      })
      .catch((error) => {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los servicios de streaming.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  const addStreamingService = useCallback(
    async (name: string) => {
      if (!userId) return false
      if (customStreamingServices.includes(name)) return true
      try {
        const inserted = await insertCustomStreamingService(name, userId)
        setCustomStreamingServices((prev) => (prev.includes(inserted) ? prev : [...prev, inserted]))
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar el servicio.')
        return false
      }
    },
    [userId, customStreamingServices],
  )

  const value = useMemo<StreamingServicesStore>(
    () => ({ customStreamingServices, isLoading, addStreamingService }),
    [customStreamingServices, isLoading, addStreamingService],
  )

  return <StreamingServicesStoreContext.Provider value={value}>{children}</StreamingServicesStoreContext.Provider>
}

export function useStreamingServicesStore(): StreamingServicesStore {
  const context = useContext(StreamingServicesStoreContext)
  if (!context) {
    throw new Error('useStreamingServicesStore debe usarse dentro de un <StreamingServicesStoreProvider>')
  }
  return context
}

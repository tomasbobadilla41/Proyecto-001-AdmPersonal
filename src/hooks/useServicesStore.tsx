import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { ServiceConfig } from '../types/finance'
import { useAuth } from './useAuth'
import { deleteServiceRow, fetchServices, insertService, updateServiceRow } from '../services/paymentServicesApi'

/** Reemplaza el elemento con ese `id`, o lo deja igual si no lo encuentra. */
function replaceById<T extends { id: string }>(items: T[], updated: T): T[] {
  return items.map((item) => (item.id === updated.id ? updated : item))
}

interface ServicesStore {
  services: ServiceConfig[]
  isLoading: boolean
  /** Agrega un servicio nuevo al directorio. Devuelve `false` si falló (ya mostró su propio toast). */
  addService: (service: ServiceConfig) => Promise<boolean>
  /** Reemplaza un servicio existente (mismo `id`). */
  updateService: (service: ServiceConfig) => Promise<boolean>
  removeService: (id: string) => Promise<boolean>
}

const ServicesStoreContext = createContext<ServicesStore | null>(null)

/**
 * Directorio de servicios (nro de cliente/CBU + link de pago para cada
 * gasto fijo) del usuario activo, persistido en Supabase (tabla
 * `payment_services`, con RLS por `user_id`).
 */
export function ServicesStoreProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id

  const [services, setServices] = useState<ServiceConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setServices([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    fetchServices(userId)
      .then((data) => {
        if (!cancelled) setServices(data)
      })
      .catch((error) => {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar el directorio de servicios.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  const addService = useCallback(
    async (service: ServiceConfig) => {
      if (!userId) return false
      try {
        const inserted = await insertService(service, userId)
        setServices((prev) => [...prev, inserted])
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar el servicio.')
        return false
      }
    },
    [userId],
  )

  const updateService = useCallback(
    async (service: ServiceConfig) => {
      if (!userId) return false
      try {
        const updated = await updateServiceRow(service, userId)
        setServices((prev) => replaceById(prev, updated))
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el servicio.')
        return false
      }
    },
    [userId],
  )

  const removeService = useCallback(async (id: string) => {
    try {
      await deleteServiceRow(id)
      setServices((prev) => prev.filter((s) => s.id !== id))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el servicio.')
      return false
    }
  }, [])

  const value = useMemo<ServicesStore>(
    () => ({ services, isLoading, addService, updateService, removeService }),
    [services, isLoading, addService, updateService, removeService],
  )

  return <ServicesStoreContext.Provider value={value}>{children}</ServicesStoreContext.Provider>
}

export function useServicesStore(): ServicesStore {
  const context = useContext(ServicesStoreContext)
  if (!context) {
    throw new Error('useServicesStore debe usarse dentro de un <ServicesStoreProvider>')
  }
  return context
}

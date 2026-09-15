import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import type { ServiceConfig } from '../types/finance'
import { useLocalStorage } from './useLocalStorage'

const SERVICES_STORAGE_KEY = 'admpersonal:services'

/** Reemplaza el elemento con ese `id`, o lo deja igual si no lo encuentra. */
function replaceById<T extends { id: string }>(items: T[], updated: T): T[] {
  return items.map((item) => (item.id === updated.id ? updated : item))
}

interface ServicesStore {
  services: ServiceConfig[]
  /** Agrega un servicio nuevo al directorio. */
  addService: (service: ServiceConfig) => void
  /** Reemplaza un servicio existente (mismo `id`). */
  updateService: (service: ServiceConfig) => void
  removeService: (id: string) => void
}

const ServicesStoreContext = createContext<ServicesStore | null>(null)

/**
 * Directorio de servicios (nro de cliente/CBU + link de pago para cada
 * gasto fijo), persistido en `localStorage`. Mismo patrón que
 * `useFinanceStore`: se instancia una sola vez en la raíz de la app
 * (`App.tsx`) para que cualquier alta/edición/borrado se refleje al
 * instante en todo lo que consuma `useServicesStore` — sin recargar la
 * página — apenas React vuelve a renderizar.
 *
 * Si `localStorage` está vacío (primera vez que se abre la app), el
 * directorio arranca vacío: no se siembra con datos de ejemplo.
 */
export function ServicesStoreProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useLocalStorage<ServiceConfig[]>(SERVICES_STORAGE_KEY, [])

  const addService = useCallback(
    (service: ServiceConfig) => setServices((prev) => [...prev, service]),
    [setServices],
  )
  const updateService = useCallback(
    (service: ServiceConfig) => setServices((prev) => replaceById(prev, service)),
    [setServices],
  )
  const removeService = useCallback(
    (id: string) => setServices((prev) => prev.filter((s) => s.id !== id)),
    [setServices],
  )

  const value = useMemo<ServicesStore>(
    () => ({ services, addService, updateService, removeService }),
    [services, addService, updateService, removeService],
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

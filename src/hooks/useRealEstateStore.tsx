import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type {
  LeaseContract,
  Property,
  PropertyExpense,
  PropertyIncome,
  PropertyServiceConfig,
} from '../types/realEstate'
import { useAuth } from './useAuth'
import {
  deleteContractRow,
  deletePropertyExpenseRow,
  deletePropertyIncomeRow,
  deletePropertyRow,
  deleteServiceConfigRow,
  fetchContracts,
  fetchProperties,
  fetchPropertyExpenses,
  fetchPropertyIncomes,
  fetchServiceConfigs,
  insertContract,
  insertProperty,
  insertPropertyExpense,
  insertPropertyIncome,
  insertServiceConfig,
  updateContractRow,
  updatePropertyExpenseRow,
  updatePropertyIncomeRow,
  updatePropertyRow,
  updateServiceConfigRow,
} from '../services/realEstateApi'

/** Reemplaza el elemento con ese `id`, o lo deja igual si no lo encuentra. */
function replaceById<T extends { id: string }>(items: T[], updated: T): T[] {
  return items.map((item) => (item.id === updated.id ? updated : item))
}

interface RealEstateStore {
  properties: Property[]
  serviceConfigs: PropertyServiceConfig[]
  expenses: PropertyExpense[]
  incomes: PropertyIncome[]
  contracts: LeaseContract[]
  /** `true` mientras se trae la carga inicial de las 5 colecciones. */
  isLoading: boolean

  addProperty: (property: Property) => Promise<boolean>
  updateProperty: (property: Property) => Promise<boolean>
  removeProperty: (id: string) => Promise<boolean>
  /**
   * Borra la propiedad Y todo lo que depende de ella (sus servicios, gastos
   * e ingresos y contratos). Postgres ya cascadea por `ON DELETE CASCADE`;
   * acá además se limpia el estado local para que la UI no muestre
   * registros huérfanos sin esperar un refetch.
   */
  removePropertyCascade: (id: string) => Promise<boolean>

  addServiceConfig: (config: PropertyServiceConfig) => Promise<boolean>
  updateServiceConfig: (config: PropertyServiceConfig) => Promise<boolean>
  removeServiceConfig: (id: string) => Promise<boolean>

  addExpense: (expense: PropertyExpense) => Promise<boolean>
  updateExpense: (expense: PropertyExpense) => Promise<boolean>
  removeExpense: (id: string) => Promise<boolean>

  addIncome: (income: PropertyIncome) => Promise<boolean>
  updateIncome: (income: PropertyIncome) => Promise<boolean>
  removeIncome: (id: string) => Promise<boolean>

  addContract: (contract: LeaseContract) => Promise<boolean>
  updateContract: (contract: LeaseContract) => Promise<boolean>
  removeContract: (id: string) => Promise<boolean>
}

const RealEstateStoreContext = createContext<RealEstateStore | null>(null)

/**
 * Módulo de propiedades en alquiler: `Property`, la configuración de sus
 * servicios (`PropertyServiceConfig`), los registros mensuales de gastos e
 * ingresos (`PropertyExpense`/`PropertyIncome`) y sus contratos
 * (`LeaseContract`) — todo persistido en Supabase (5 tablas con RLS por
 * `user_id`, relacionadas entre sí por `property_id`). Mismo patrón que
 * `useExpenseStore`: fetch inicial con sesión activa, cada operación de
 * escritura devuelve `Promise<boolean>` + su propio toast de error, estado
 * local sincronizado con la respuesta real de Supabase.
 */
export function RealEstateStoreProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id

  const [properties, setProperties] = useState<Property[]>([])
  const [serviceConfigs, setServiceConfigs] = useState<PropertyServiceConfig[]>([])
  const [expenses, setExpenses] = useState<PropertyExpense[]>([])
  const [incomes, setIncomes] = useState<PropertyIncome[]>([])
  const [contracts, setContracts] = useState<LeaseContract[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setProperties([])
      setServiceConfigs([])
      setExpenses([])
      setIncomes([])
      setContracts([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    Promise.all([
      fetchProperties(userId),
      fetchServiceConfigs(userId),
      fetchPropertyExpenses(userId),
      fetchPropertyIncomes(userId),
      fetchContracts(userId),
    ])
      .then(([propertiesData, serviceConfigsData, expensesData, incomesData, contractsData]) => {
        if (cancelled) return
        setProperties(propertiesData)
        setServiceConfigs(serviceConfigsData)
        setExpenses(expensesData)
        setIncomes(incomesData)
        setContracts(contractsData)
      })
      .catch((error) => {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las propiedades.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  // --- Properties ---
  const addProperty = useCallback(
    async (property: Property) => {
      if (!userId) return false
      try {
        const inserted = await insertProperty(property, userId)
        setProperties((prev) => [...prev, inserted])
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar la propiedad.')
        return false
      }
    },
    [userId],
  )
  const updateProperty = useCallback(
    async (property: Property) => {
      if (!userId) return false
      try {
        const updated = await updatePropertyRow(property, userId)
        setProperties((prev) => replaceById(prev, updated))
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la propiedad.')
        return false
      }
    },
    [userId],
  )
  const removeProperty = useCallback(async (id: string) => {
    try {
      await deletePropertyRow(id)
      setProperties((prev) => prev.filter((p) => p.id !== id))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la propiedad.')
      return false
    }
  }, [])
  const removePropertyCascade = useCallback(async (id: string) => {
    try {
      await deletePropertyRow(id)
      setProperties((prev) => prev.filter((p) => p.id !== id))
      setServiceConfigs((prev) => prev.filter((c) => c.propertyId !== id))
      setExpenses((prev) => prev.filter((e) => e.propertyId !== id))
      setIncomes((prev) => prev.filter((i) => i.propertyId !== id))
      setContracts((prev) => prev.filter((c) => c.propertyId !== id))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la propiedad.')
      return false
    }
  }, [])

  // --- Service configs ---
  const addServiceConfig = useCallback(
    async (config: PropertyServiceConfig) => {
      if (!userId) return false
      try {
        const inserted = await insertServiceConfig(config, userId)
        setServiceConfigs((prev) => [...prev, inserted])
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar el servicio.')
        return false
      }
    },
    [userId],
  )
  const updateServiceConfig = useCallback(
    async (config: PropertyServiceConfig) => {
      if (!userId) return false
      try {
        const updated = await updateServiceConfigRow(config, userId)
        setServiceConfigs((prev) => replaceById(prev, updated))
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el servicio.')
        return false
      }
    },
    [userId],
  )
  const removeServiceConfig = useCallback(async (id: string) => {
    try {
      await deleteServiceConfigRow(id)
      setServiceConfigs((prev) => prev.filter((c) => c.id !== id))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el servicio.')
      return false
    }
  }, [])

  // --- Expenses ---
  const addExpense = useCallback(
    async (expense: PropertyExpense) => {
      if (!userId) return false
      try {
        const inserted = await insertPropertyExpense(expense, userId)
        setExpenses((prev) => [...prev, inserted])
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar el gasto.')
        return false
      }
    },
    [userId],
  )
  const updateExpense = useCallback(
    async (expense: PropertyExpense) => {
      if (!userId) return false
      try {
        const updated = await updatePropertyExpenseRow(expense, userId)
        setExpenses((prev) => replaceById(prev, updated))
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el gasto.')
        return false
      }
    },
    [userId],
  )
  const removeExpense = useCallback(async (id: string) => {
    try {
      await deletePropertyExpenseRow(id)
      setExpenses((prev) => prev.filter((e) => e.id !== id))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el gasto.')
      return false
    }
  }, [])

  // --- Incomes ---
  const addIncome = useCallback(
    async (income: PropertyIncome) => {
      if (!userId) return false
      try {
        const inserted = await insertPropertyIncome(income, userId)
        setIncomes((prev) => [...prev, inserted])
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar el ingreso.')
        return false
      }
    },
    [userId],
  )
  const updateIncome = useCallback(
    async (income: PropertyIncome) => {
      if (!userId) return false
      try {
        const updated = await updatePropertyIncomeRow(income, userId)
        setIncomes((prev) => replaceById(prev, updated))
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el ingreso.')
        return false
      }
    },
    [userId],
  )
  const removeIncome = useCallback(async (id: string) => {
    try {
      await deletePropertyIncomeRow(id)
      setIncomes((prev) => prev.filter((i) => i.id !== id))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el ingreso.')
      return false
    }
  }, [])

  // --- Contracts ---
  const addContract = useCallback(
    async (contract: LeaseContract) => {
      if (!userId) return false
      try {
        const inserted = await insertContract(contract, userId)
        setContracts((prev) => [...prev, inserted])
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar el contrato.')
        return false
      }
    },
    [userId],
  )
  const updateContract = useCallback(
    async (contract: LeaseContract) => {
      if (!userId) return false
      try {
        const updated = await updateContractRow(contract, userId)
        setContracts((prev) => replaceById(prev, updated))
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el contrato.')
        return false
      }
    },
    [userId],
  )
  const removeContract = useCallback(async (id: string) => {
    try {
      await deleteContractRow(id)
      setContracts((prev) => prev.filter((c) => c.id !== id))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el contrato.')
      return false
    }
  }, [])

  const value = useMemo<RealEstateStore>(
    () => ({
      properties,
      serviceConfigs,
      expenses,
      incomes,
      contracts,
      isLoading,
      addProperty,
      updateProperty,
      removeProperty,
      removePropertyCascade,
      addServiceConfig,
      updateServiceConfig,
      removeServiceConfig,
      addExpense,
      updateExpense,
      removeExpense,
      addIncome,
      updateIncome,
      removeIncome,
      addContract,
      updateContract,
      removeContract,
    }),
    [
      properties,
      serviceConfigs,
      expenses,
      incomes,
      contracts,
      isLoading,
      addProperty,
      updateProperty,
      removeProperty,
      removePropertyCascade,
      addServiceConfig,
      updateServiceConfig,
      removeServiceConfig,
      addExpense,
      updateExpense,
      removeExpense,
      addIncome,
      updateIncome,
      removeIncome,
      addContract,
      updateContract,
      removeContract,
    ],
  )

  return <RealEstateStoreContext.Provider value={value}>{children}</RealEstateStoreContext.Provider>
}

export function useRealEstateStore(): RealEstateStore {
  const context = useContext(RealEstateStoreContext)
  if (!context) {
    throw new Error('useRealEstateStore debe usarse dentro de un <RealEstateStoreProvider>')
  }
  return context
}

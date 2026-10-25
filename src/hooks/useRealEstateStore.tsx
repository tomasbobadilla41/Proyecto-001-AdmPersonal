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
import { useAddAction, useRemoveAction, useUpdateAction } from './storeHelpers'

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
  const addProperty = useAddAction(setProperties, userId, insertProperty, 'No se pudo guardar la propiedad.')
  const updateProperty = useUpdateAction(setProperties, userId, updatePropertyRow, 'No se pudo actualizar la propiedad.')
  const removeProperty = useRemoveAction(setProperties, deletePropertyRow, 'No se pudo eliminar la propiedad.')
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
  const addServiceConfig = useAddAction(setServiceConfigs, userId, insertServiceConfig, 'No se pudo guardar el servicio.')
  const updateServiceConfig = useUpdateAction(
    setServiceConfigs,
    userId,
    updateServiceConfigRow,
    'No se pudo actualizar el servicio.',
  )
  const removeServiceConfig = useRemoveAction(setServiceConfigs, deleteServiceConfigRow, 'No se pudo eliminar el servicio.')

  // --- Expenses ---
  const addExpense = useAddAction(setExpenses, userId, insertPropertyExpense, 'No se pudo guardar el gasto.')
  const updateExpense = useUpdateAction(setExpenses, userId, updatePropertyExpenseRow, 'No se pudo actualizar el gasto.')
  const removeExpense = useRemoveAction(setExpenses, deletePropertyExpenseRow, 'No se pudo eliminar el gasto.')

  // --- Incomes ---
  const addIncome = useAddAction(setIncomes, userId, insertPropertyIncome, 'No se pudo guardar el ingreso.')
  const updateIncome = useUpdateAction(setIncomes, userId, updatePropertyIncomeRow, 'No se pudo actualizar el ingreso.')
  const removeIncome = useRemoveAction(setIncomes, deletePropertyIncomeRow, 'No se pudo eliminar el ingreso.')

  // --- Contracts ---
  const addContract = useAddAction(setContracts, userId, insertContract, 'No se pudo guardar el contrato.')
  const updateContract = useUpdateAction(setContracts, userId, updateContractRow, 'No se pudo actualizar el contrato.')
  const removeContract = useRemoveAction(setContracts, deleteContractRow, 'No se pudo eliminar el contrato.')

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

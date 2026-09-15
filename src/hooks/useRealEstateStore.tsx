import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import type {
  LeaseContract,
  Property,
  PropertyExpense,
  PropertyIncome,
  PropertyServiceConfig,
} from '../types/realEstate'
import { useLocalStorage } from './useLocalStorage'

const STORAGE_KEYS = {
  properties: 'admpersonal:realEstate:properties',
  serviceConfigs: 'admpersonal:realEstate:serviceConfigs',
  expenses: 'admpersonal:realEstate:expenses',
  incomes: 'admpersonal:realEstate:incomes',
  contracts: 'admpersonal:realEstate:contracts',
} as const

/** Reemplaza el elemento con ese `id`, o lo deja igual si no lo encuentra. */
function replaceById<T extends { id: string }>(items: T[], updated: T): T[] {
  return items.map((item) => (item.id === updated.id ? updated : item))
}

interface RealEstateStore {
  properties: Property[]
  serviceConfigs: PropertyServiceConfig[]
  expenses: PropertyExpense[]
  incomes: PropertyIncome[]

  addProperty: (property: Property) => void
  updateProperty: (property: Property) => void
  removeProperty: (id: string) => void
  /**
   * Borra la propiedad Y todo lo que depende de ella (sus servicios, gastos
   * e ingresos) para no dejar registros huérfanos en `localStorage`.
   */
  removePropertyCascade: (id: string) => void

  addServiceConfig: (config: PropertyServiceConfig) => void
  updateServiceConfig: (config: PropertyServiceConfig) => void
  removeServiceConfig: (id: string) => void

  addExpense: (expense: PropertyExpense) => void
  updateExpense: (expense: PropertyExpense) => void
  removeExpense: (id: string) => void

  addIncome: (income: PropertyIncome) => void
  updateIncome: (income: PropertyIncome) => void
  removeIncome: (id: string) => void

  contracts: LeaseContract[]
  addContract: (contract: LeaseContract) => void
  updateContract: (contract: LeaseContract) => void
  removeContract: (id: string) => void
}

const RealEstateStoreContext = createContext<RealEstateStore | null>(null)

/**
 * Módulo independiente para administrar propiedades en alquiler:
 * `Property`, la configuración de sus servicios (`PropertyServiceConfig`),
 * los registros mensuales de gastos e ingresos (`PropertyExpense` /
 * `PropertyIncome`) y sus contratos de alquiler (`LeaseContract`). Mismo
 * patrón que `useFinanceStore`/`useServicesStore`:
 * Context + `localStorage`, instanciado una sola vez en la raíz de la app
 * (`App.tsx`) para que cualquier alta/edición/borrado se refleje al
 * instante en todo lo que consuma `useRealEstateStore`.
 *
 * Si `localStorage` está vacío (primera vez que se abre la app), todo
 * arranca vacío: no se siembra con datos de ejemplo.
 */
export function RealEstateStoreProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useLocalStorage<Property[]>(STORAGE_KEYS.properties, [])
  const [serviceConfigs, setServiceConfigs] = useLocalStorage<PropertyServiceConfig[]>(
    STORAGE_KEYS.serviceConfigs,
    [],
  )
  const [expenses, setExpenses] = useLocalStorage<PropertyExpense[]>(STORAGE_KEYS.expenses, [])
  const [incomes, setIncomes] = useLocalStorage<PropertyIncome[]>(STORAGE_KEYS.incomes, [])
  const [contracts, setContracts] = useLocalStorage<LeaseContract[]>(STORAGE_KEYS.contracts, [])

  const addProperty = useCallback(
    (property: Property) => setProperties((prev) => [...prev, property]),
    [setProperties],
  )
  const updateProperty = useCallback(
    (property: Property) => setProperties((prev) => replaceById(prev, property)),
    [setProperties],
  )
  const removeProperty = useCallback(
    (id: string) => setProperties((prev) => prev.filter((p) => p.id !== id)),
    [setProperties],
  )
  const removePropertyCascade = useCallback(
    (id: string) => {
      setProperties((prev) => prev.filter((p) => p.id !== id))
      setServiceConfigs((prev) => prev.filter((c) => c.propertyId !== id))
      setExpenses((prev) => prev.filter((e) => e.propertyId !== id))
      setIncomes((prev) => prev.filter((i) => i.propertyId !== id))
      setContracts((prev) => prev.filter((c) => c.propertyId !== id))
    },
    [setProperties, setServiceConfigs, setExpenses, setIncomes, setContracts],
  )

  const addServiceConfig = useCallback(
    (config: PropertyServiceConfig) => setServiceConfigs((prev) => [...prev, config]),
    [setServiceConfigs],
  )
  const updateServiceConfig = useCallback(
    (config: PropertyServiceConfig) => setServiceConfigs((prev) => replaceById(prev, config)),
    [setServiceConfigs],
  )
  const removeServiceConfig = useCallback(
    (id: string) => setServiceConfigs((prev) => prev.filter((c) => c.id !== id)),
    [setServiceConfigs],
  )

  const addExpense = useCallback(
    (expense: PropertyExpense) => setExpenses((prev) => [...prev, expense]),
    [setExpenses],
  )
  const updateExpense = useCallback(
    (expense: PropertyExpense) => setExpenses((prev) => replaceById(prev, expense)),
    [setExpenses],
  )
  const removeExpense = useCallback(
    (id: string) => setExpenses((prev) => prev.filter((e) => e.id !== id)),
    [setExpenses],
  )

  const addIncome = useCallback(
    (income: PropertyIncome) => setIncomes((prev) => [...prev, income]),
    [setIncomes],
  )
  const updateIncome = useCallback(
    (income: PropertyIncome) => setIncomes((prev) => replaceById(prev, income)),
    [setIncomes],
  )
  const removeIncome = useCallback(
    (id: string) => setIncomes((prev) => prev.filter((i) => i.id !== id)),
    [setIncomes],
  )

  const addContract = useCallback(
    (contract: LeaseContract) => setContracts((prev) => [...prev, contract]),
    [setContracts],
  )
  const updateContract = useCallback(
    (contract: LeaseContract) => setContracts((prev) => replaceById(prev, contract)),
    [setContracts],
  )
  const removeContract = useCallback(
    (id: string) => setContracts((prev) => prev.filter((c) => c.id !== id)),
    [setContracts],
  )

  const value = useMemo<RealEstateStore>(
    () => ({
      properties,
      serviceConfigs,
      expenses,
      incomes,
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
      contracts,
      addContract,
      updateContract,
      removeContract,
    }),
    [
      properties,
      serviceConfigs,
      expenses,
      incomes,
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
      contracts,
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

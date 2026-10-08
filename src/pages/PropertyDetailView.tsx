import { useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import type { LeaseContract, PropertyExpense, PropertyIncome, PropertyServiceConfig } from '../types/realEstate'
import { MonthYearSelector } from '../components/expenses/MonthYearSelector'
import { PropertyFormDrawer } from '../components/realestate/PropertyFormDrawer'
import { PropertyServiceFormDrawer } from '../components/realestate/PropertyServiceFormDrawer'
import { RentIncomeInput } from '../components/realestate/RentIncomeInput'
import { ServiceChecklistTable } from '../components/realestate/ServiceChecklistTable'
import { ActiveLeaseCard } from '../components/realestate/ActiveLeaseCard'
import { LeaseContractFormDrawer } from '../components/realestate/LeaseContractFormDrawer'
import { useRealEstateStore } from '../hooks/useRealEstateStore'
import { getAvailableRealEstateYears } from '../utils/realEstate'
import { getActiveContract } from '../utils/leaseContract'

interface PropertyDetailViewProps {
  propertyId: string
  onBack: () => void
}

type ServiceFormState = { mode: 'create' } | { mode: 'edit'; config: PropertyServiceConfig } | null
type ContractFormState = { mode: 'create' } | { mode: 'edit'; contract: LeaseContract } | null

export function PropertyDetailView({ propertyId, onBack }: PropertyDetailViewProps) {
  const {
    properties,
    serviceConfigs,
    expenses,
    incomes,
    contracts,
    updateProperty,
    removePropertyCascade,
    addServiceConfig,
    updateServiceConfig,
    removeServiceConfig,
    addExpense,
    updateExpense,
    addIncome,
    updateIncome,
    addContract,
    updateContract,
    removeContract,
  } = useRealEstateStore()

  const foundProperty = properties.find((p) => p.id === propertyId)

  const [isEditingProperty, setIsEditingProperty] = useState(false)
  const [serviceFormState, setServiceFormState] = useState<ServiceFormState>(null)
  const [contractFormState, setContractFormState] = useState<ContractFormState>(null)

  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [year, setYear] = useState(() => new Date().getFullYear())

  const years = useMemo(() => getAvailableRealEstateYears(expenses, incomes), [expenses, incomes])

  const propertyServices = useMemo(
    () => serviceConfigs.filter((s) => s.propertyId === propertyId),
    [serviceConfigs, propertyId],
  )
  // Todos los registros de esta propiedad (no solo los del mes elegido) —
  // para poder avisar cuántos se van a borrar junto con la propiedad.
  const relatedRecordsCount = useMemo(() => {
    const servicesCount = propertyServices.length
    const expensesCount = expenses.filter((e) => e.propertyId === propertyId).length
    const incomesCount = incomes.filter((i) => i.propertyId === propertyId).length
    const contractsCount = contracts.filter((c) => c.propertyId === propertyId).length
    return servicesCount + expensesCount + incomesCount + contractsCount
  }, [propertyServices, expenses, incomes, contracts, propertyId])
  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.propertyId === propertyId && e.month === month && e.year === year),
    [expenses, propertyId, month, year],
  )
  const monthIncome = useMemo(
    () => incomes.find((i) => i.propertyId === propertyId && i.month === month && i.year === year),
    [incomes, propertyId, month, year],
  )
  const activeContract = useMemo(
    () => getActiveContract(contracts, propertyId, month, year),
    [contracts, propertyId, month, year],
  )

  if (!foundProperty) {
    return (
      <div className="flex flex-col gap-4">
        <BackButton onBack={onBack} />
        <p className="text-sm text-faint">No se encontró la propiedad.</p>
      </div>
    )
  }

  // Variable aparte (no `foundProperty` directamente) para que TypeScript la
  // siga viendo como definida dentro de las funciones anidadas de abajo.
  const property = foundProperty

  function handleDeleteProperty() {
    const message =
      relatedRecordsCount > 0
        ? `¿Eliminar la propiedad "${property.name}"? Se borrarán también ${relatedRecordsCount} registro(s) vinculados (servicios, gastos, ingresos y contratos).`
        : `¿Eliminar la propiedad "${property.name}"?`

    if (window.confirm(message)) {
      void removePropertyCascade(property.id)
      onBack()
    }
  }

  function handleSubmitService(config: PropertyServiceConfig) {
    if (serviceFormState?.mode === 'edit') void updateServiceConfig(config)
    else void addServiceConfig(config)
    setServiceFormState(null)
  }

  function handleDeleteService(config: PropertyServiceConfig) {
    if (window.confirm(`¿Eliminar el servicio "${config.serviceName}"?`)) {
      void removeServiceConfig(config.id)
    }
  }

  function handleSaveExpense(expense: PropertyExpense) {
    const exists = expenses.some((e) => e.id === expense.id)
    if (exists) void updateExpense(expense)
    else void addExpense(expense)
  }

  function handleSaveIncome(income: PropertyIncome) {
    const exists = incomes.some((i) => i.id === income.id)
    if (exists) void updateIncome(income)
    else void addIncome(income)
  }

  function handleSubmitContract(contract: LeaseContract) {
    if (contractFormState?.mode === 'edit') void updateContract(contract)
    else void addContract(contract)
    setContractFormState(null)
  }

  function handleDeleteContract(contract: LeaseContract) {
    if (window.confirm(`¿Eliminar el contrato de "${contract.tenantName}"?`)) {
      void removeContract(contract.id)
    }
  }

  function handleSaveRentUpdate(newAmount: number) {
    if (!activeContract) return
    void updateContract({ ...activeContract, currentRentAmount: newAmount })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <BackButton onBack={onBack} />
          <div>
            <h2 className="text-xl font-semibold text-ink">{property.name}</h2>
            <p className="text-sm text-muted">{property.address}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsEditingProperty(true)}
            aria-label="Editar propiedad"
            className="rounded-lg p-2 text-faint transition-colors hover:bg-line hover:text-ink-soft"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleDeleteProperty}
            aria-label="Eliminar propiedad"
            className="rounded-lg p-2 text-faint transition-colors hover:bg-rose-500/10 hover:text-rose-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ActiveLeaseCard
        contract={activeContract}
        month={month}
        year={year}
        onCreate={() => setContractFormState({ mode: 'create' })}
        onEdit={(contract) => setContractFormState({ mode: 'edit', contract })}
        onDelete={handleDeleteContract}
        onSaveRentUpdate={handleSaveRentUpdate}
      />

      {/* Panel de Configuración de Servicios (fijo, no depende del mes) */}
      <Section
        title="Configuración de Servicios"
        actionLabel="Agregar servicio"
        onAction={() => setServiceFormState({ mode: 'create' })}
      >
        {propertyServices.length === 0 ? (
          <EmptyText>Todavía no configuraste servicios para esta propiedad.</EmptyText>
        ) : (
          <ul className="flex flex-col gap-2">
            {propertyServices.map((service) => (
              <li
                key={service.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-app px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{service.serviceName}</p>
                  <p className="truncate text-xs text-faint">
                    Nro. de cuenta: {service.accountNumber}
                    {service.isAutoDebit && ' · Débito automático'}
                  </p>
                </div>
                <RowActions
                  onEdit={() => setServiceFormState({ mode: 'edit', config: service })}
                  onDelete={() => handleDeleteService(service)}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Checklist Mensual (dinámico, cruza servicios configurados vs. el mes elegido) */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-sm font-medium text-muted">Checklist Mensual</h3>
          <MonthYearSelector mes={month} anio={year} years={years} onMesChange={setMonth} onAnioChange={setYear} />
        </div>

        <RentIncomeInput
          propertyId={propertyId}
          month={month}
          year={year}
          existingIncome={monthIncome}
          onSave={handleSaveIncome}
        />

        <ServiceChecklistTable
          services={propertyServices}
          monthExpenses={monthExpenses}
          propertyId={propertyId}
          month={month}
          year={year}
          onSaveExpense={handleSaveExpense}
        />
      </div>

      <PropertyFormDrawer
        isOpen={isEditingProperty}
        onClose={() => setIsEditingProperty(false)}
        onSubmit={updateProperty}
        initialProperty={property}
      />
      <PropertyServiceFormDrawer
        isOpen={serviceFormState !== null}
        onClose={() => setServiceFormState(null)}
        onSubmit={handleSubmitService}
        propertyId={propertyId}
        initialConfig={serviceFormState?.mode === 'edit' ? serviceFormState.config : undefined}
      />
      <LeaseContractFormDrawer
        isOpen={contractFormState !== null}
        onClose={() => setContractFormState(null)}
        onSubmit={handleSubmitContract}
        propertyId={propertyId}
        initialContract={contractFormState?.mode === 'edit' ? contractFormState.contract : undefined}
      />
    </div>
  )
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      aria-label="Volver"
      className="rounded-lg border border-line p-2 text-muted transition-colors hover:bg-line hover:text-ink"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  )
}

function EmptyText({ children }: { children: ReactNode }) {
  return <p className="text-sm text-faint">{children}</p>
}

interface SectionProps {
  title: string
  actionLabel: string
  onAction: () => void
  children: ReactNode
}

function Section({ title, actionLabel, onAction, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted">{title}</h3>
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-1 rounded-lg border border-line-strong px-2 py-1 text-xs font-medium text-ink-soft transition-colors hover:bg-line"
        >
          <Plus className="h-3.5 w-3.5" />
          {actionLabel}
        </button>
      </div>
      {children}
    </section>
  )
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        onClick={onEdit}
        aria-label="Editar"
        className="rounded-lg p-1.5 text-faint transition-colors hover:bg-line hover:text-ink-soft"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Eliminar"
        className="rounded-lg p-1.5 text-faint transition-colors hover:bg-rose-500/10 hover:text-rose-400"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

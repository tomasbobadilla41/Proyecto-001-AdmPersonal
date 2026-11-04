import { useMemo, useState } from 'react'
import { ArrowLeft, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { LeaseContract, PropertyExpense, PropertyIncome, PropertyServiceConfig } from '../types/realEstate'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { MonthNavigator } from '../components/common/MonthNavigator'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { SummaryMetrics } from '../components/common/SummaryMetrics'
import { PropertyFormDrawer } from '../components/realestate/PropertyFormDrawer'
import { PropertyServiceFormDrawer } from '../components/realestate/PropertyServiceFormDrawer'
import { RentIncomeInput } from '../components/realestate/RentIncomeInput'
import { ServiceChecklistTable } from '../components/realestate/ServiceChecklistTable'
import { ActiveLeaseCard } from '../components/realestate/ActiveLeaseCard'
import { LeaseContractFormDrawer } from '../components/realestate/LeaseContractFormDrawer'
import { useRealEstateStore } from '../hooks/useRealEstateStore'
import { useExchangeRateStore } from '../hooks/useExchangeRateStore'
import { formatMoney } from '../utils/currency'
import { getExchangeRate } from '../utils/finance'
import { sumPropertyExpenses, sumPropertyIncomes } from '../utils/realEstate'
import { getActiveContract } from '../utils/leaseContract'

interface PropertyDetailViewProps {
  propertyId: string
  onBack: () => void
}

type ServiceFormState = { mode: 'create' } | { mode: 'edit'; config: PropertyServiceConfig } | null
type ContractFormState = { mode: 'create' } | { mode: 'edit'; contract: LeaseContract } | null
type DeleteTarget =
  | { kind: 'property' }
  | { kind: 'service'; config: PropertyServiceConfig }
  | { kind: 'contract'; contract: LeaseContract }
  | null

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
  const { exchangeRates } = useExchangeRateStore()

  const foundProperty = properties.find((p) => p.id === propertyId)

  const [isEditingProperty, setIsEditingProperty] = useState(false)
  const [serviceFormState, setServiceFormState] = useState<ServiceFormState>(null)
  const [contractFormState, setContractFormState] = useState<ContractFormState>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)

  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [year, setYear] = useState(() => new Date().getFullYear())

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

  // Resumen del mes en ARS (los ingresos en USD se convierten con el tipo de cambio del mes).
  const tipoCambio = getExchangeRate(exchangeRates, month, year)
  const cobrado = sumPropertyIncomes(incomes, month, year, tipoCambio, propertyId)
  const gastos = sumPropertyExpenses(expenses, month, year, { propertyId, statuses: ['PAID', 'AUTO_DEBIT'] })
  const neto = cobrado - gastos

  if (!foundProperty) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <BackButton onBack={onBack} />
        <p className="text-sm text-faint">No se encontró la propiedad.</p>
      </div>
    )
  }

  // Variable aparte (no `foundProperty` directamente) para que TypeScript la
  // siga viendo como definida dentro de las funciones anidadas de abajo.
  const property = foundProperty

  function handleSubmitService(config: PropertyServiceConfig) {
    if (serviceFormState?.mode === 'edit') void updateServiceConfig(config)
    else void addServiceConfig(config)
    setServiceFormState(null)
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

  function handleSaveRentUpdate(newAmount: number) {
    if (!activeContract) return
    void updateContract({ ...activeContract, currentRentAmount: newAmount })
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'property') {
      void removePropertyCascade(property.id)
      onBack()
    } else if (deleteTarget.kind === 'service') {
      void removeServiceConfig(deleteTarget.config.id)
    } else {
      void removeContract(deleteTarget.contract.id)
    }
    setDeleteTarget(null)
  }

  const deleteDialog = (() => {
    switch (deleteTarget?.kind) {
      case 'property':
        return {
          title: `¿Eliminar "${property.name}"?`,
          description:
            relatedRecordsCount > 0
              ? `También se borrarán ${relatedRecordsCount} registro(s) vinculados (servicios, gastos, ingresos y contratos). No se puede deshacer.`
              : 'No se puede deshacer.',
        }
      case 'service':
        return {
          title: `¿Eliminar el servicio "${deleteTarget.config.serviceName}"?`,
          description: 'Los pagos ya registrados de meses anteriores no se borran.',
        }
      case 'contract':
        return {
          title: `¿Eliminar el contrato de "${deleteTarget.contract.tenantName}"?`,
          description: 'Los alquileres ya cobrados no se borran.',
        }
      default:
        return { title: '', description: '' }
    }
  })()

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex items-start gap-3">
        <BackButton onBack={onBack} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-2xl font-semibold tracking-tight text-ink">{property.name}</h2>
          <p className="truncate text-sm text-muted">{property.address}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Acciones de la propiedad"
            className="rounded-lg p-2 text-faint outline-none transition-colors hover:bg-line hover:text-ink-soft focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <MoreHorizontal className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setIsEditingProperty(true)}>
              <Pencil className="h-4 w-4" />
              Editar propiedad
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget({ kind: 'property' })}>
              <Trash2 className="h-4 w-4" />
              Eliminar propiedad
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* El mes elegido gobierna todo lo de abajo: contrato vigente, alquiler y servicios. */}
      <MonthNavigator
        mes={month}
        anio={year}
        onChange={(m, y) => {
          setMonth(m)
          setYear(y)
        }}
      />

      <SummaryMetrics
        metrics={[
          { label: 'Cobrado', value: formatMoney({ amount: cobrado, currency: 'ARS' }) },
          { label: 'Gastos', value: formatMoney({ amount: gastos, currency: 'ARS' }) },
          {
            label: 'Neto',
            value: formatMoney({ amount: neto, currency: 'ARS' }),
            valueClassName: neto > 0 ? 'text-positive' : neto < 0 ? 'text-negative' : 'text-ink',
          },
        ]}
      />

      <ActiveLeaseCard
        contract={activeContract}
        month={month}
        year={year}
        onCreate={() => setContractFormState({ mode: 'create' })}
        onEdit={(contract) => setContractFormState({ mode: 'edit', contract })}
        onDelete={(contract) => setDeleteTarget({ kind: 'contract', contract })}
        onSaveRentUpdate={handleSaveRentUpdate}
      />

      <RentIncomeInput
        propertyId={propertyId}
        month={month}
        year={year}
        existingIncome={monthIncome}
        suggestedAmount={activeContract?.currentRentAmount}
        onSave={handleSaveIncome}
      />

      <ServiceChecklistTable
        services={propertyServices}
        monthExpenses={monthExpenses}
        propertyId={propertyId}
        month={month}
        year={year}
        onSaveExpense={handleSaveExpense}
        onAddService={() => setServiceFormState({ mode: 'create' })}
        onEditService={(config) => setServiceFormState({ mode: 'edit', config })}
        onDeleteService={(config) => setDeleteTarget({ kind: 'service', config })}
      />

      <PropertyFormDrawer
        isOpen={isEditingProperty}
        onClose={() => setIsEditingProperty(false)}
        onSubmit={(updated) => {
          void updateProperty(updated)
          setIsEditingProperty(false)
        }}
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
      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteDialog.title}
        description={deleteDialog.description}
        confirmLabel="Eliminar"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      aria-label="Volver a Propiedades"
      className="mt-0.5 rounded-lg border border-line p-2 text-muted transition-colors hover:bg-line hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  )
}

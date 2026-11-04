import { useMemo, useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { FloatingActionButton } from '../components/common/FloatingActionButton'
import { SummaryMetrics } from '../components/common/SummaryMetrics'
import { Skeleton } from '../components/common/Skeleton'
import { PropertyFormDrawer } from '../components/realestate/PropertyFormDrawer'
import { PropertyDetailView } from './PropertyDetailView'
import { useRealEstateStore } from '../hooks/useRealEstateStore'
import { useExchangeRateStore } from '../hooks/useExchangeRateStore'
import { formatMoney } from '../utils/currency'
import { getExchangeRate, MESES_LARGOS } from '../utils/finance'
import { sumPropertyExpenses, sumPropertyIncomes } from '../utils/realEstate'
import { getActiveContract } from '../utils/leaseContract'

export function RealEstateDashboardView() {
  const { properties, expenses, incomes, contracts, isLoading, addProperty } = useRealEstateStore()
  const { exchangeRates } = useExchangeRateStore()

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [isAddingProperty, setIsAddingProperty] = useState(false)

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const tipoCambio = getExchangeRate(exchangeRates, month, year)

  const totalIngresos = useMemo(
    () => sumPropertyIncomes(incomes, month, year, tipoCambio),
    [incomes, month, year, tipoCambio],
  )
  const totalGastos = useMemo(() => sumPropertyExpenses(expenses, month, year), [expenses, month, year])
  const neto = totalIngresos - totalGastos

  if (selectedPropertyId) {
    return <PropertyDetailView propertyId={selectedPropertyId} onBack={() => setSelectedPropertyId(null)} />
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Propiedades</h2>
        <p className="text-sm text-muted">
          {MESES_LARGOS[month - 1]} {year}
        </p>
      </div>

      {properties.length > 0 && (
        <SummaryMetrics
          metrics={[
            { label: 'Alquileres cobrados', value: formatMoney({ amount: totalIngresos, currency: 'ARS' }) },
            { label: 'Gastos', value: formatMoney({ amount: totalGastos, currency: 'ARS' }) },
            {
              label: 'Neto del mes',
              value: formatMoney({ amount: neto, currency: 'ARS' }),
              valueClassName: neto > 0 ? 'text-positive' : neto < 0 ? 'text-negative' : 'text-ink',
            },
          ]}
        />
      )}

      {isLoading ? (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-4 w-24" />
            </li>
          ))}
        </ul>
      ) : properties.length === 0 ? (
        <p className="rounded-xl border border-line bg-panel px-5 py-10 text-center text-sm text-faint">
          Todavía no agregaste ninguna propiedad.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
          {properties.map((property) => {
            const alquilerCobrado = sumPropertyIncomes(incomes, month, year, tipoCambio, property.id)
            const gastosPagados = sumPropertyExpenses(expenses, month, year, {
              propertyId: property.id,
              statuses: ['PAID', 'AUTO_DEBIT'],
            })
            const contract = getActiveContract(contracts, property.id, month, year)
            // "Sin cobrar" solo tiene sentido si hay un contrato que lo espere.
            const isRentPending = contract !== undefined && alquilerCobrado === 0

            return (
              <li key={property.id}>
                <button
                  type="button"
                  onClick={() => setSelectedPropertyId(property.id)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-line/30 focus-visible:bg-line/30 focus-visible:outline-none sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{property.name}</p>
                    <p className="truncate text-xs text-faint">
                      {contract ? contract.tenantName : 'Sin contrato vigente'} · {property.address}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {!contract && alquilerCobrado === 0 && gastosPagados === 0 ? (
                      // Nada que mostrar este mes: evita la fila de "$ 0,00 / gastos $ 0,00".
                      <p className="text-xs text-faint">Sin movimientos</p>
                    ) : isRentPending ? (
                      <p className="text-sm text-faint">Sin cobrar</p>
                    ) : (
                      <p className="text-sm font-medium tabular-nums text-ink">
                        {formatMoney({ amount: alquilerCobrado, currency: 'ARS' })}
                      </p>
                    )}
                    {(contract || alquilerCobrado > 0 || gastosPagados > 0) && (
                      <p className="text-xs tabular-nums text-faint">
                        gastos {formatMoney({ amount: gastosPagados, currency: 'ARS' })}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-faint" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <FloatingActionButton icon={Plus} label="Agregar propiedad" onClick={() => setIsAddingProperty(true)} />
      <PropertyFormDrawer
        isOpen={isAddingProperty}
        onClose={() => setIsAddingProperty(false)}
        onSubmit={(property) => {
          void addProperty(property)
          setIsAddingProperty(false)
        }}
        initialProperty={undefined}
      />
    </div>
  )
}

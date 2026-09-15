import { useMemo, useState } from 'react'
import { Plus, Receipt, Wallet } from 'lucide-react'
import { StatCard } from '../components/common/StatCard'
import { FloatingActionButton } from '../components/common/FloatingActionButton'
import { PropertyCard } from '../components/realestate/PropertyCard'
import { PropertyFormDrawer } from '../components/realestate/PropertyFormDrawer'
import { PropertyDetailView } from './PropertyDetailView'
import { useRealEstateStore } from '../hooks/useRealEstateStore'
import { useFinanceStore } from '../hooks/useFinanceStore'
import { formatMoney } from '../utils/currency'
import { getExchangeRate } from '../utils/finance'
import { sumPropertyExpenses, sumPropertyIncomes } from '../utils/realEstate'

export function RealEstateDashboardView() {
  const { properties, expenses, incomes, addProperty } = useRealEstateStore()
  const { exchangeRates } = useFinanceStore()

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

  if (selectedPropertyId) {
    return <PropertyDetailView propertyId={selectedPropertyId} onBack={() => setSelectedPropertyId(null)} />
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Propiedades</h2>
        <p className="text-sm text-slate-400">Alquileres, servicios y gastos — mes actual</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard title="Ingresos Totales por Alquileres" icon={Wallet} iconClassName="text-emerald-400">
          <span className="text-2xl font-semibold text-slate-100">
            {formatMoney({ amount: totalIngresos, currency: 'ARS' })}
          </span>
          <p className="text-xs text-slate-500">Todas las propiedades, mes actual</p>
        </StatCard>
        <StatCard title="Gastos Totales de Propiedades" icon={Receipt} iconClassName="text-rose-400">
          <span className="text-2xl font-semibold text-slate-100">
            {formatMoney({ amount: totalGastos, currency: 'ARS' })}
          </span>
          <p className="text-xs text-slate-500">Todas las propiedades, mes actual</p>
        </StatCard>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-500">
          Todavía no agregaste ninguna propiedad.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => {
            const alquilerCobrado = sumPropertyIncomes(incomes, month, year, tipoCambio, property.id)
            const gastosPagados = sumPropertyExpenses(expenses, month, year, {
              propertyId: property.id,
              statuses: ['PAID', 'AUTO_DEBIT'],
            })

            return (
              <PropertyCard
                key={property.id}
                name={property.name}
                address={property.address}
                alquilerCobrado={alquilerCobrado}
                gastosPagados={gastosPagados}
                onManage={() => setSelectedPropertyId(property.id)}
              />
            )
          })}
        </div>
      )}

      <FloatingActionButton icon={Plus} label="Agregar propiedad" onClick={() => setIsAddingProperty(true)} />
      <PropertyFormDrawer
        isOpen={isAddingProperty}
        onClose={() => setIsAddingProperty(false)}
        onSubmit={addProperty}
      />
    </div>
  )
}

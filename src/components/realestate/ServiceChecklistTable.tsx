import type { PropertyExpense, PropertyServiceConfig } from '../../types/realEstate'
import { matchesServiceConfig } from '../../utils/realEstate'
import { ServiceChecklistRow } from './ServiceChecklistRow'

interface ServiceChecklistTableProps {
  services: PropertyServiceConfig[]
  /** Gastos ya filtrados a este propertyId + mes/año. */
  monthExpenses: PropertyExpense[]
  propertyId: string
  month: number
  year: number
  onSaveExpense: (expense: PropertyExpense) => void
}

export function ServiceChecklistTable({
  services,
  monthExpenses,
  propertyId,
  month,
  year,
  onSaveExpense,
}: ServiceChecklistTableProps) {
  if (services.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-500">
        Configurá servicios arriba para verlos en el checklist mensual.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-900/70 text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Servicio</th>
            <th className="px-4 py-3 font-medium">Nro. de Cuenta</th>
            <th className="px-4 py-3 font-medium">Monto</th>
            <th className="px-4 py-3 text-right font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {services.map((service) => (
            <ServiceChecklistRow
              key={service.id}
              service={service}
              expense={monthExpenses.find((e) => matchesServiceConfig(e, service))}
              propertyId={propertyId}
              month={month}
              year={year}
              onSave={onSaveExpense}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

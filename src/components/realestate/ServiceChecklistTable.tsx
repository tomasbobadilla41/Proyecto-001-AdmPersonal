import { Plus } from 'lucide-react'
import type { PropertyExpense, PropertyServiceConfig } from '../../types/realEstate'
import { Button } from '../ui/button'
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
  onAddService: () => void
  onEditService: (config: PropertyServiceConfig) => void
  onDeleteService: (config: PropertyServiceConfig) => void
}

/**
 * Servicios de la propiedad con su estado en el mes elegido. Reemplaza al par
 * "Configuración de servicios" + "Checklist mensual", que listaban los mismos
 * servicios dos veces: ahora se configuran y se pagan desde la misma fila.
 */
export function ServiceChecklistTable({
  services,
  monthExpenses,
  propertyId,
  month,
  year,
  onSaveExpense,
  onAddService,
  onEditService,
  onDeleteService,
}: ServiceChecklistTableProps) {
  const settledCount = services.filter((service) =>
    monthExpenses.some((e) => matchesServiceConfig(e, service)),
  ).length

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-line bg-panel">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div>
          <h3 className="text-sm font-medium text-ink">Servicios e impuestos</h3>
          {services.length > 0 && (
            <p className="text-xs text-faint tabular-nums">
              {settledCount} de {services.length} cargados este mes
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onAddService}>
          <Plus />
          Agregar
        </Button>
      </div>

      {services.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-faint">
          Agregá los servicios de la propiedad (luz, gas, ABL…) para seguir sus pagos mes a mes.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {services.map((service) => (
            <ServiceChecklistRow
              key={service.id}
              service={service}
              expense={monthExpenses.find((e) => matchesServiceConfig(e, service))}
              propertyId={propertyId}
              month={month}
              year={year}
              onSave={onSaveExpense}
              onEditService={() => onEditService(service)}
              onDeleteService={() => onDeleteService(service)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

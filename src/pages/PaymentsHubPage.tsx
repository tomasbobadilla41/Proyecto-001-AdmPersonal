import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Expense, ServiceConfig } from '../types/finance'
import { ServiceConfigCard } from '../components/payments/ServiceConfigCard'
import { ServiceConfigFormDrawer } from '../components/payments/ServiceConfigFormDrawer'
import { ExpenseFormDrawer } from '../components/expenses/ExpenseFormDrawer'
import { FloatingActionButton } from '../components/common/FloatingActionButton'
import { useServicesStore } from '../hooks/useServicesStore'
import { useFinanceStore } from '../hooks/useFinanceStore'

type ServiceFormState = { mode: 'create' } | { mode: 'edit'; service: ServiceConfig } | null

export function PaymentsHubPage() {
  const { services, addService, updateService, removeService } = useServicesStore()
  const { addExpense } = useFinanceStore()

  const [formState, setFormState] = useState<ServiceFormState>(null)
  // Servicio para el que se está registrando un pago (abre el drawer de Gasto pre-completado).
  const [payingService, setPayingService] = useState<ServiceConfig | null>(null)

  function handleDelete(service: ServiceConfig) {
    if (window.confirm(`¿Eliminar el servicio "${service.category}" del directorio?`)) {
      removeService(service.id)
    }
  }

  function handleSubmitService(service: ServiceConfig) {
    if (formState?.mode === 'edit') {
      updateService(service)
    } else {
      addService(service)
    }
    setFormState(null)
  }

  function handleSubmitExpense(expense: Expense) {
    addExpense(expense)
    setPayingService(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Centro de Pagos</h2>
        <p className="text-sm text-slate-400">Directorio de servicios para pagar tus gastos fijos</p>
      </div>

      {services.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-500">
          Todavía no configuraste ningún servicio.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceConfigCard
              key={service.id}
              service={service}
              onEdit={() => setFormState({ mode: 'edit', service })}
              onDelete={() => handleDelete(service)}
              onRegisterPayment={() => setPayingService(service)}
            />
          ))}
        </div>
      )}

      <FloatingActionButton
        icon={Plus}
        label="Configurar nuevo servicio"
        onClick={() => setFormState({ mode: 'create' })}
      />

      <ServiceConfigFormDrawer
        isOpen={formState !== null}
        onClose={() => setFormState(null)}
        onSubmit={handleSubmitService}
        initialService={formState?.mode === 'edit' ? formState.service : undefined}
      />

      <ExpenseFormDrawer
        isOpen={payingService !== null}
        onClose={() => setPayingService(null)}
        onSubmit={handleSubmitExpense}
        prefill={payingService ? { category: payingService.category, expenseType: 'FIJO' } : undefined}
      />
    </div>
  )
}

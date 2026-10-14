import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { FixedExpenseCategory, ServiceConfig } from '../types/finance'
import { ServiceConfigCard } from '../components/payments/ServiceConfigCard'
import { ServiceConfigFormDrawer } from '../components/payments/ServiceConfigFormDrawer'
import { RegisterPaymentModal } from '../components/payments/RegisterPaymentModal'
import { InvoiceDropzone } from '../components/payments/InvoiceDropzone'
import { FloatingActionButton } from '../components/common/FloatingActionButton'
import { useServicesStore } from '../hooks/useServicesStore'
import { useExpenseStore } from '../hooks/useExpenseStore'

type ServiceFormState = { mode: 'create' } | { mode: 'edit'; service: ServiceConfig } | null

export function PaymentsHubPage() {
  const { services, isLoading, addService, updateService, removeService } = useServicesStore()
  const { expenses, addExpenses } = useExpenseStore()

  const [formState, setFormState] = useState<ServiceFormState>(null)
  // Servicio para el que se está registrando un pago (abre el modal chico de monto).
  const [payingService, setPayingService] = useState<ServiceConfig | null>(null)
  // Monto que detectó el lector de facturas (IA) para precargar el modal de arriba — undefined si se abrió a mano.
  const [prefillAmount, setPrefillAmount] = useState<number | undefined>(undefined)
  // Cuenta/categoría sugeridas por el lector de facturas cuando no matcheó ningún servicio existente (precarga el alta).
  const [invoiceDraft, setInvoiceDraft] = useState<{ accountNumber?: string; category?: FixedExpenseCategory } | undefined>(
    undefined,
  )

  // `service_id`s con al menos un gasto cargado en el mes/año en curso — define el semáforo de cada tarjeta.
  const paidServiceIdsThisMonth = useMemo(() => {
    const now = new Date()
    const mes = now.getMonth()
    const anio = now.getFullYear()
    return new Set(
      expenses
        .filter((e) => e.serviceId && e.fecha.getUTCMonth() === mes && e.fecha.getUTCFullYear() === anio)
        .map((e) => e.serviceId as string),
    )
  }, [expenses])

  function handleDelete(service: ServiceConfig) {
    if (window.confirm(`¿Eliminar el servicio "${service.title}" del directorio?`)) {
      void removeService(service.id)
    }
  }

  async function handleSubmitService(service: ServiceConfig) {
    setFormState(null)

    if (formState?.mode === 'edit') {
      void updateService(service)
      return
    }

    const inserted = await addService(service)
    // Si este alta vino del lector de facturas (hay un monto pendiente),
    // encadenamos directo al modal de "Registrar Pago" ya precargado. Si no
    // se pudo encadenar (falló el insert, o no era un alta vía IA), se
    // descarta el monto pendiente para no "pegarlo" a la próxima alta manual.
    if (inserted && prefillAmount !== undefined) {
      setPayingService(inserted)
    } else {
      setPrefillAmount(undefined)
    }
    setInvoiceDraft(undefined)
  }

  function handleInvoiceNoMatch(sugerencia: { accountNumber: string; category?: FixedExpenseCategory; montoDetectado: number }) {
    setInvoiceDraft({ accountNumber: sugerencia.accountNumber, category: sugerencia.category })
    setPrefillAmount(sugerencia.montoDetectado)
    setFormState({ mode: 'create' })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-ink">Centro de Pagos</h2>
        <p className="text-sm text-muted">Directorio de servicios para pagar tus gastos fijos</p>
      </div>

      <InvoiceDropzone
        services={services}
        onMatch={(service, montoDetectado) => {
          setPrefillAmount(montoDetectado)
          setPayingService(service)
        }}
        onNoMatch={handleInvoiceNoMatch}
      />

      {isLoading ? (
        <div className="rounded-2xl border border-line bg-panel p-8 text-center text-sm text-faint">
          Cargando servicios…
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-2xl border border-line bg-panel p-8 text-center text-sm text-faint">
          Todavía no configuraste ningún servicio.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceConfigCard
              key={service.id}
              service={service}
              isPaidThisMonth={paidServiceIdsThisMonth.has(service.id)}
              onEdit={() => {
                setPrefillAmount(undefined)
                setFormState({ mode: 'edit', service })
              }}
              onDelete={() => handleDelete(service)}
              onRegisterPayment={() => {
                setPrefillAmount(undefined)
                setPayingService(service)
              }}
              onInvoiceAmountDetected={(montoDetectado) => {
                setPrefillAmount(montoDetectado)
                setPayingService(service)
              }}
            />
          ))}
        </div>
      )}

      <FloatingActionButton
        icon={Plus}
        label="Configurar nuevo servicio"
        onClick={() => {
          setInvoiceDraft(undefined)
          setPrefillAmount(undefined)
          setFormState({ mode: 'create' })
        }}
      />

      <ServiceConfigFormDrawer
        isOpen={formState !== null}
        onClose={() => {
          setFormState(null)
          setInvoiceDraft(undefined)
          setPrefillAmount(undefined)
        }}
        onSubmit={handleSubmitService}
        initialService={formState?.mode === 'edit' ? formState.service : undefined}
        initialDraft={formState?.mode === 'create' ? invoiceDraft : undefined}
      />

      <RegisterPaymentModal
        service={payingService}
        prefillAmount={prefillAmount}
        onClose={() => {
          setPayingService(null)
          setPrefillAmount(undefined)
        }}
        onSubmit={(expense) => {
          void addExpenses([expense])
          setPayingService(null)
          setPrefillAmount(undefined)
        }}
      />
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { Expense, FixedExpenseCategory, ServiceConfig } from '../types/finance'
import { ServiceConfigCard } from '../components/payments/ServiceConfigCard'
import { ServiceConfigFormDrawer } from '../components/payments/ServiceConfigFormDrawer'
import { RegisterPaymentModal } from '../components/payments/RegisterPaymentModal'
import { InvoiceDropzone } from '../components/payments/InvoiceDropzone'
import { FloatingActionButton } from '../components/common/FloatingActionButton'
import { CardSkeleton } from '../components/common/CardSkeleton'
import { useServicesStore } from '../hooks/useServicesStore'
import { useExpenseStore } from '../hooks/useExpenseStore'
import { formatMoney } from '../utils/currency'

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

  // `serviceId` -> gasto ya cargado en el mes/año en curso para ese servicio.
  // Define el semáforo de cada tarjeta y, además, deja detectar si ya hay un
  // pago registrado antes de abrir "Registrar Pago" de nuevo (ver
  // `openRegisterPayment`) — así una factura de Expensas subida dos veces no
  // termina duplicada sin aviso.
  const expenseThisMonthByServiceId = useMemo(() => {
    const now = new Date()
    const mes = now.getMonth()
    const anio = now.getFullYear()
    const map = new Map<string, Expense>()
    for (const e of expenses) {
      if (e.serviceId && e.fecha.getUTCMonth() === mes && e.fecha.getUTCFullYear() === anio) {
        map.set(e.serviceId, e)
      }
    }
    return map
  }, [expenses])

  const paidServiceIdsThisMonth = useMemo(
    () => new Set(expenseThisMonthByServiceId.keys()),
    [expenseThisMonthByServiceId],
  )

  /** Punto único por el que se abre "Registrar Pago" (botón manual, factura matcheada en el dropzone, o factura subida directo en la tarjeta) — así el chequeo de duplicado aplica siempre, no solo en uno de los tres caminos. */
  function openRegisterPayment(service: ServiceConfig, montoDetectado?: number) {
    const yaRegistrado = expenseThisMonthByServiceId.get(service.id)
    if (yaRegistrado) {
      const continuar = window.confirm(
        `Ya registraste un pago de ${formatMoney({ amount: yaRegistrado.monto, currency: yaRegistrado.moneda })} para "${service.title}" este mes (el ${yaRegistrado.fecha.toLocaleDateString('es-AR')}). ¿Querés registrar otro pago igual?`,
      )
      if (!continuar) return
    }
    setPrefillAmount(montoDetectado)
    setPayingService(service)
  }

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
        onMatch={(service, montoDetectado) => openRegisterPayment(service, montoDetectado)}
        onNoMatch={handleInvoiceNoMatch}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-xl border border-line bg-panel p-8 text-center text-sm text-faint">
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
              onRegisterPayment={() => openRegisterPayment(service)}
              onInvoiceAmountDetected={(montoDetectado) => openRegisterPayment(service, montoDetectado)}
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
        onSubmit={async (expense) => {
          // Solo cierra si de verdad se guardó — si falló, `addExpenses` ya
          // mostró su toast de error y el modal queda abierto para reintentar
          // (en vez de cerrarse igual y que el usuario, sin feedback, lo
          // vuelva a intentar desde cero y termine duplicando el gasto).
          const ok = await addExpenses([expense])
          if (ok) {
            setPayingService(null)
            setPrefillAmount(undefined)
          }
        }}
      />
    </div>
  )
}

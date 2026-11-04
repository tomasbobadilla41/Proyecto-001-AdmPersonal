import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { Expense, FixedExpenseCategory, ServiceConfig } from '../types/finance'
import { ServiceRow } from '../components/payments/ServiceRow'
import { PaymentsMonthSummary } from '../components/payments/PaymentsMonthSummary'
import { ServiceConfigFormDrawer } from '../components/payments/ServiceConfigFormDrawer'
import { RegisterPaymentModal } from '../components/payments/RegisterPaymentModal'
import { InvoiceDropzone } from '../components/payments/InvoiceDropzone'
import { FloatingActionButton } from '../components/common/FloatingActionButton'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { Skeleton } from '../components/common/Skeleton'
import { useServicesStore } from '../hooks/useServicesStore'
import { useExpenseStore } from '../hooks/useExpenseStore'
import { formatMoney } from '../utils/currency'
import { effectiveDueDay } from '../utils/dueDate'

type ServiceFormState = { mode: 'create' } | { mode: 'edit'; service: ServiceConfig } | null
/** "Registrar Pago" en espera de confirmar porque ya hay un pago este mes para ese servicio. */
type PendingDuplicate = { service: ServiceConfig; montoDetectado?: number; existing: Expense } | null

/** Orden de pendientes: por día de vencimiento (los sin vencimiento al final), después por nombre. */
function compareByDueDay(a: ServiceConfig, b: ServiceConfig, today: Date): number {
  const dueA = a.dueDay ? effectiveDueDay(a.dueDay, today) : Number.POSITIVE_INFINITY
  const dueB = b.dueDay ? effectiveDueDay(b.dueDay, today) : Number.POSITIVE_INFINITY
  return dueA - dueB || a.title.localeCompare(b.title, 'es')
}

export function PaymentsHubPage() {
  const { services, isLoading, addService, updateService, removeService } = useServicesStore()
  const { expenses, addExpenses } = useExpenseStore()

  const [formState, setFormState] = useState<ServiceFormState>(null)
  // Servicio para el que se está registrando un pago (abre el modal chico de monto).
  const [payingService, setPayingService] = useState<ServiceConfig | null>(null)
  // Monto que detectó el lector de facturas (IA) para precargar el modal de arriba — undefined si se abrió a mano.
  const [prefillAmount, setPrefillAmount] = useState<number | undefined>(undefined)
  // Cuenta/categoría sugeridas por el lector de facturas cuando no matcheó ningún servicio existente (precarga el alta).
  const [pendingDuplicate, setPendingDuplicate] = useState<PendingDuplicate>(null)
  const [serviceToDelete, setServiceToDelete] = useState<ServiceConfig | null>(null)
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

  const { pending, paid } = useMemo(() => {
    const today = new Date()
    const pendingList = services
      .filter((s) => !expenseThisMonthByServiceId.has(s.id))
      .sort((a, b) => compareByDueDay(a, b, today))
    const paidList = services
      .filter((s) => expenseThisMonthByServiceId.has(s.id))
      .sort((a, b) => a.title.localeCompare(b.title, 'es'))
    return { pending: pendingList, paid: paidList }
  }, [services, expenseThisMonthByServiceId])

  /** Punto único por el que se abre "Registrar Pago" (botón manual, factura matcheada en el dropzone, o factura subida directo en la tarjeta) — así el chequeo de duplicado aplica siempre, no solo en uno de los tres caminos. */
  function openRegisterPayment(service: ServiceConfig, montoDetectado?: number) {
    const yaRegistrado = expenseThisMonthByServiceId.get(service.id)
    if (yaRegistrado) {
      // Se confirma en un diálogo (ver `ConfirmDialog` abajo) antes de seguir.
      setPendingDuplicate({ service, montoDetectado, existing: yaRegistrado })
      return
    }
    startRegisterPayment(service, montoDetectado)
  }

  function startRegisterPayment(service: ServiceConfig, montoDetectado?: number) {
    setPrefillAmount(montoDetectado)
    setPayingService(service)
  }

  function openCreateService() {
    setInvoiceDraft(undefined)
    setPrefillAmount(undefined)
    setFormState({ mode: 'create' })
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

  function renderRow(service: ServiceConfig) {
    return (
      <ServiceRow
        key={service.id}
        service={service}
        paidExpense={expenseThisMonthByServiceId.get(service.id)}
        onEdit={() => {
          setPrefillAmount(undefined)
          setFormState({ mode: 'edit', service })
        }}
        onDelete={() => setServiceToDelete(service)}
        onRegisterPayment={() => openRegisterPayment(service)}
        onInvoiceAmountDetected={(montoDetectado) => openRegisterPayment(service, montoDetectado)}
      />
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <h2 className="text-2xl font-semibold tracking-tight text-ink">Centro de Pagos</h2>

      {isLoading ? (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando servicios">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-panel px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink">Todavía no configuraste ningún servicio</p>
          <p className="max-w-sm text-sm text-muted">
            Cargá tus servicios fijos (luz, gas, expensas…) para ver qué falta pagar cada mes y pagarlos en un clic.
          </p>
          <button
            type="button"
            onClick={openCreateService}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
          >
            <Plus className="h-4 w-4" />
            Configurar primer servicio
          </button>
          <p className="mt-2 text-xs text-faint">o subí una factura y lo creamos a partir de ella:</p>
          <div className="w-full max-w-md text-left">
            <InvoiceDropzone
              services={services}
              onMatch={(service, montoDetectado) => openRegisterPayment(service, montoDetectado)}
              onNoMatch={handleInvoiceNoMatch}
            />
          </div>
        </div>
      ) : (
        <>
          <PaymentsMonthSummary total={services.length} paid={paid.length} nextPending={pending[0]} />

          <InvoiceDropzone
            services={services}
            onMatch={(service, montoDetectado) => openRegisterPayment(service, montoDetectado)}
            onNoMatch={handleInvoiceNoMatch}
          />

          {pending.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="px-1 text-sm font-medium text-muted">Pendientes · {pending.length}</h3>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
                {pending.map(renderRow)}
              </ul>
            </section>
          )}

          {paid.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="px-1 text-sm font-medium text-muted">Pagados este mes · {paid.length}</h3>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
                {paid.map(renderRow)}
              </ul>
            </section>
          )}
        </>
      )}

      {services.length > 0 && <FloatingActionButton icon={Plus} label="Nuevo servicio" onClick={openCreateService} />}

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

      <ConfirmDialog
        open={pendingDuplicate !== null}
        title="Ya registraste un pago este mes"
        description={
          pendingDuplicate && (
            <>
              <span className="font-medium text-ink-soft">{pendingDuplicate.service.title}</span>:{' '}
              {formatMoney({ amount: pendingDuplicate.existing.monto, currency: pendingDuplicate.existing.moneda })} el{' '}
              {pendingDuplicate.existing.fecha.toLocaleDateString('es-AR', { timeZone: 'UTC' })}. ¿Querés registrar otro
              pago?
            </>
          )
        }
        confirmLabel="Registrar otro"
        onCancel={() => setPendingDuplicate(null)}
        onConfirm={() => {
          if (pendingDuplicate) startRegisterPayment(pendingDuplicate.service, pendingDuplicate.montoDetectado)
          setPendingDuplicate(null)
        }}
      />

      <ConfirmDialog
        open={serviceToDelete !== null}
        title="¿Eliminar este servicio?"
        description={
          serviceToDelete && (
            <>
              Se quita <span className="font-medium text-ink-soft">{serviceToDelete.title}</span> del directorio. Los
              pagos ya registrados quedan en Gastos.
            </>
          )
        }
        confirmLabel="Eliminar"
        destructive
        onCancel={() => setServiceToDelete(null)}
        onConfirm={() => {
          if (serviceToDelete) void removeService(serviceToDelete.id)
          setServiceToDelete(null)
        }}
      />
    </div>
  )
}

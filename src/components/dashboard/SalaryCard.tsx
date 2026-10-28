import { useRef, useState, type ChangeEvent } from 'react'
import { Loader2, Pencil, Upload, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import type { Expense, Income, ServiceConfig } from '../../types/finance'
import { formatMoney, formatUsdEquivalent } from '../../utils/currency'
import { toARS, todayISODate } from '../../utils/finance'
import { parsePayslipPdf, type ParsedPayslip } from '../../services/parsePayslipApi'
import { useServicesStore } from '../../hooks/useServicesStore'
import { useExpenseStore } from '../../hooks/useExpenseStore'
import { StatCard } from '../common/StatCard'

const GIMNASIO_CATEGORY = 'Gimnasio'

const INPUT_CLASSNAME =
  'rounded-lg border border-line bg-app px-2 py-1.5 text-sm text-ink focus:border-accent focus:outline-none'

/** "Detectamos 8hs extra (≈ $45.000) en el recibo." — cantidad y monto son opcionales, cada uno se omite si Gemini no lo pudo leer. */
function formatHorasExtrasNote(horasExtras: ParsedPayslip['horasExtras']): string {
  const partes: string[] = []
  if (horasExtras.cantidadHoras) partes.push(`${horasExtras.cantidadHoras}hs`)
  if (horasExtras.monto) partes.push(`≈ ${formatMoney({ amount: horasExtras.monto, currency: 'ARS' })}`)

  const detalle = partes.length > 0 ? ` (${partes.join(', ')})` : ''
  return `Detectamos horas extra${detalle} en el recibo.`
}

/**
 * Si el recibo trae un descuento de gimnasio y hay un servicio "Gimnasio"
 * configurado en el Centro de Pagos que todavía no tiene un pago registrado
 * este mes, devuelve los datos para ofrecer el auto-registro. `null` en
 * cualquier otro caso (sin descuento, sin servicio configurado, o ya pagado).
 */
function findGymOffer(
  data: ParsedPayslip,
  services: ServiceConfig[],
  expenses: Expense[],
): { service: ServiceConfig; monto: number } | null {
  if (!data.descuentoGimnasio) return null

  const service = services.find((s) => s.category === GIMNASIO_CATEGORY)
  if (!service) return null

  const now = new Date()
  const alreadyPaidThisMonth = expenses.some(
    (e) =>
      e.serviceId === service.id &&
      e.fecha.getUTCMonth() === now.getMonth() &&
      e.fecha.getUTCFullYear() === now.getFullYear(),
  )
  if (alreadyPaidThisMonth) return null

  return { service, monto: data.descuentoGimnasio }
}

interface SalaryCardProps {
  mes: number
  anio: number
  income: Income | undefined
  tipoCambio: number
  onSave: (income: Income) => void
}

export function SalaryCard({ mes, anio, income, tipoCambio, onSave }: SalaryCardProps) {
  const { services } = useServicesStore()
  const { expenses, addExpenses } = useExpenseStore()

  const [isEditing, setIsEditing] = useState(false)
  const [sueldoARS, setSueldoARS] = useState('')
  const [sueldoUSD, setSueldoUSD] = useState('')
  const [isReadingPdf, setIsReadingPdf] = useState(false)
  // No se persiste — ver la discusión en el PR: es un aviso que solo vale
  // para este momento de carga, no un dato histórico consultable después.
  const [horasExtras, setHorasExtras] = useState<ParsedPayslip['horasExtras'] | null>(null)
  // Oferta de auto-registro del descuento de Gimnasio detectado en el recibo
  // (solo si hay un servicio "Gimnasio" en el Centro de Pagos y todavía no
  // se le registró un pago este mes — si no, no tiene sentido ofrecerlo).
  const [gymOffer, setGymOffer] = useState<{ service: ServiceConfig; monto: number } | null>(null)
  const [isRegisteringGymPayment, setIsRegisteringGymPayment] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function startEditing() {
    setSueldoARS(income ? String(income.sueldoARS) : '')
    setSueldoUSD(income ? String(income.sueldoUSD) : '')
    setHorasExtras(null)
    setGymOffer(null)
    setIsEditing(true)
  }

  function handleSave() {
    onSave({
      id: income?.id ?? `inc-${anio}-${String(mes).padStart(2, '0')}`,
      mes,
      anio,
      sueldoARS: Number(sueldoARS) || 0,
      sueldoUSD: Number(sueldoUSD) || 0,
    })
    setIsEditing(false)
  }

  async function handlePayslipFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setIsReadingPdf(true)
    try {
      const data = await parsePayslipPdf(file)
      setSueldoARS(String(data.sueldoNeto))
      setHorasExtras(data.horasExtras.detectadas ? data.horasExtras : null)
      setGymOffer(findGymOffer(data, services, expenses))
      toast.success('Recibo leído — revisá el monto antes de guardar.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al leer el recibo. Probá de nuevo en unos segundos.')
    } finally {
      setIsReadingPdf(false)
    }
  }

  async function handleRegisterGymPayment() {
    if (!gymOffer) return

    setIsRegisteringGymPayment(true)
    try {
      const saved = await addExpenses([
        {
          id: `exp-${Date.now()}`,
          fecha: new Date(todayISODate()),
          descripcion: gymOffer.service.title,
          monto: gymOffer.monto,
          moneda: 'ARS',
          expenseType: 'FIJO',
          category: gymOffer.service.category,
          serviceId: gymOffer.service.id,
        },
      ])
      if (saved) {
        toast.success('Pago de Gimnasio registrado en el Centro de Pagos.')
        setGymOffer(null)
      }
      // Si falló, el store ya mostró su propio toast — dejamos gymOffer como
      // está para que el botón siga disponible y se pueda reintentar.
    } finally {
      setIsRegisteringGymPayment(false)
    }
  }

  if (isEditing) {
    return (
      <StatCard title="Ingresos Totales" icon={Wallet} iconClassName="text-emerald-400">
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Sueldo ARS
            <input
              type="number"
              min="0"
              step="0.01"
              autoFocus
              value={sueldoARS}
              onChange={(e) => setSueldoARS(e.target.value)}
              className={INPUT_CLASSNAME}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Sueldo USD
            <input
              type="number"
              min="0"
              step="0.01"
              value={sueldoUSD}
              onChange={(e) => setSueldoUSD(e.target.value)}
              className={INPUT_CLASSNAME}
            />
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handlePayslipFileChange}
          />
          <button
            type="button"
            onClick={() => !isReadingPdf && fileInputRef.current?.click()}
            disabled={isReadingPdf}
            className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-accent hover:underline disabled:opacity-50"
          >
            {isReadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {isReadingPdf ? 'Leyendo recibo…' : 'o subí tu recibo (PDF)'}
          </button>

          {horasExtras && (
            <p className="rounded-lg border border-accent/30 bg-accent/5 px-2 py-1.5 text-xs text-ink-soft">
              {formatHorasExtrasNote(horasExtras)}
            </p>
          )}

          {gymOffer && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-2 py-1.5 text-xs text-ink-soft">
              <p>
                Detectamos un descuento de {gymOffer.service.title} (
                {formatMoney({ amount: gymOffer.monto, currency: 'ARS' })}) en el recibo.
              </p>
              <button
                type="button"
                onClick={handleRegisterGymPayment}
                disabled={isRegisteringGymPayment}
                className="self-start text-xs font-semibold text-accent hover:underline disabled:opacity-50"
              >
                {isRegisteringGymPayment ? 'Registrando…' : 'Registrar pago en el Centro de Pagos'}
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent transition-colors hover:bg-accent-strong"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:bg-line"
            >
              Cancelar
            </button>
          </div>
        </div>
      </StatCard>
    )
  }

  if (!income) {
    return (
      <StatCard title="Ingresos Totales" icon={Wallet} iconClassName="text-emerald-400">
        <p className="text-sm text-faint">Todavía no cargaste el sueldo de este mes.</p>
        <button
          type="button"
          onClick={startEditing}
          className="self-start rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent transition-colors hover:bg-accent-strong"
        >
          Cargar sueldo
        </button>
      </StatCard>
    )
  }

  const totalARS = income.sueldoARS + toARS(income.sueldoUSD, 'USD', tipoCambio)
  const totalEnUSD = tipoCambio > 0 ? totalARS / tipoCambio : 0

  return (
    <StatCard title="Ingresos Totales" icon={Wallet} iconClassName="text-emerald-400">
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl font-semibold text-ink">
          {formatMoney({ amount: totalARS, currency: 'ARS' })}
        </span>
        <button
          type="button"
          onClick={startEditing}
          aria-label="Editar sueldo"
          className="rounded-lg p-1.5 text-faint transition-colors hover:bg-line hover:text-ink-soft"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-faint">
        ≈ {formatUsdEquivalent(totalEnUSD)} (a TC {tipoCambio})
      </p>
    </StatCard>
  )
}

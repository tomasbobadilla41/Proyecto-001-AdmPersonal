import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory, type ExpenseType } from '../../types/finance'
import type { Currency } from '../../types/money'
import { useStreamingServicesStore } from '../../hooks/useStreamingServicesStore'
import { addMonthsUTC, toDateOnlyUTC, todayISODate } from '../../utils/finance'
import { DEFAULT_STREAMING_SERVICES } from '../../utils/streamingServices'
import { StreamingServiceField } from './StreamingServiceField'

interface ExpenseFormDrawerProps {
  isOpen: boolean
  onClose: () => void
  /** Puede ser más de un `Expense` si se cargó en cuotas. */
  onSubmit: (expenses: Expense[]) => void
  /** Si se pasa, el formulario edita ese gasto; si no, carga uno nuevo. */
  initialExpense?: Expense
  /**
   * Precarga Tipo/Categoría/Monto al crear un gasto nuevo (ej: desde
   * "Registrar Pago" en el Centro de Pagos, o desde el lector de facturas en
   * Gastos). Se ignora si `initialExpense` está presente.
   */
  prefill?: { expenseType: ExpenseType; category?: ExpenseCategory; monto?: number }
  /**
   * Lleva al Centro de Pagos y cierra el drawer. Un gasto Fijo que se repite
   * todos los meses (alquiler, luz, gimnasio) se carga ahí como servicio —
   * con vencimiento, link de pago y lectura de factura por IA — en vez de
   * con el viejo toggle "recurrente" de este formulario.
   */
  onGoToPayments: () => void
}

const INPUT_CLASSNAME =
  'w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none'

const STREAMING_CATEGORY: ExpenseCategory = 'Streaming (Netflix, YT)'
const DEFAULT_EXPENSE_TYPE: ExpenseType = 'FIJO'
const DEFAULT_CATEGORY: ExpenseCategory = EXPENSE_CATEGORIES.FIJO[0]
/** Tope de meses que se pueden generar de una sola carga (recurrente o en cuotas). */
const MAX_REPEAT_MONTHS = 24

export function ExpenseFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  initialExpense,
  prefill,
  onGoToPayments,
}: ExpenseFormDrawerProps) {
  const isEditMode = Boolean(initialExpense)
  const { customStreamingServices, addStreamingService } = useStreamingServicesStore()

  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<Currency>('ARS')
  const [expenseType, setExpenseType] = useState<ExpenseType>(DEFAULT_EXPENSE_TYPE)
  const [category, setCategory] = useState<ExpenseCategory>(DEFAULT_CATEGORY)
  const [subcategoria, setSubcategoria] = useState('')
  const [fecha, setFecha] = useState(todayISODate())
  const [descripcion, setDescripcion] = useState('')
  const [isInstallment, setIsInstallment] = useState(false)
  const [installmentCount, setInstallmentCount] = useState('1')

  const categoryOptions = EXPENSE_CATEGORIES[expenseType]

  const streamingServices = useMemo(
    () => Array.from(new Set([...DEFAULT_STREAMING_SERVICES, ...customStreamingServices])),
    [customStreamingServices],
  )

  // Recarga los campos cada vez que se abre el panel (creando o editando).
  useEffect(() => {
    if (!isOpen) return
    if (initialExpense) {
      setMonto(String(initialExpense.monto))
      setMoneda(initialExpense.moneda)
      // Defensivo: si quedó algún gasto guardado con el esquema viejo (sin
      // expenseType/category), cae en los valores por defecto en vez de romper.
      setExpenseType(initialExpense.expenseType ?? DEFAULT_EXPENSE_TYPE)
      setCategory(initialExpense.category ?? DEFAULT_CATEGORY)
      setSubcategoria(initialExpense.subcategoria ?? '')
      setFecha(toDateOnlyUTC(initialExpense.fecha))
      setDescripcion(initialExpense.descripcion)
      // Editar un gasto puntual nunca dispara una nueva carga en cuotas.
      setIsInstallment(false)
      setInstallmentCount('1')
    } else {
      setMonto(prefill?.monto !== undefined ? String(prefill.monto) : '')
      setMoneda('ARS')
      setExpenseType(prefill?.expenseType ?? DEFAULT_EXPENSE_TYPE)
      setCategory(prefill?.category ?? DEFAULT_CATEGORY)
      setSubcategoria('')
      setFecha(todayISODate())
      setDescripcion('')
      setIsInstallment(false)
      setInstallmentCount('1')
    }
  }, [isOpen, initialExpense, prefill])

  if (!isOpen) return null

  function handleExpenseTypeChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextType = event.target.value as ExpenseType
    setExpenseType(nextType)
    // Al cambiar de Fijo a Flexible (o viceversa), la categoría elegida ya no
    // es válida para el nuevo tipo: nos vamos a la primera opción del nuevo grupo.
    const nextCategory = EXPENSE_CATEGORIES[nextType][0]
    setCategory(nextCategory)
    if (nextCategory !== STREAMING_CATEGORY) {
      setSubcategoria('')
    }
  }

  function handleInstallmentToggle(checked: boolean) {
    setIsInstallment(checked)
  }

  function handleCategoryChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextCategory = event.target.value as ExpenseCategory
    setCategory(nextCategory)
    // La subcategoría (ej: qué servicio de streaming) solo aplica a Streaming.
    if (nextCategory !== STREAMING_CATEGORY) {
      setSubcategoria('')
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const montoNumerico = Number(monto)
    if (!montoNumerico || montoNumerico <= 0 || !fecha) return

    const baseDescripcion = descripcion.trim() || category

    // "En cuotas" no aplica al editar un gasto existente.
    const isInstallmentActive = !isEditMode && isInstallment

    const repeatCount = isInstallmentActive
      ? Math.min(Math.max(Number(installmentCount) || 1, 1), MAX_REPEAT_MONTHS)
      : 1

    // Todos los gastos de este lote comparten `recurringGroupId` (si hay más de uno).
    const recurringGroupId = repeatCount > 1 ? `rec-${Date.now()}` : undefined
    const baseDate = new Date(fecha)
    const batchTimestamp = Date.now()

    const expenses: Expense[] = Array.from({ length: repeatCount }, (_, index) => ({
      id: initialExpense?.id ?? `exp-${batchTimestamp}-${index}`,
      fecha: index === 0 ? baseDate : addMonthsUTC(baseDate, index),
      // En cuotas, cada registro se renombra "Descripción (Cuota i/N)"; en
      // los demás casos (recurrente o único), la descripción no cambia.
      descripcion: isInstallmentActive ? `${baseDescripcion} (Cuota ${index + 1}/${repeatCount})` : baseDescripcion,
      monto: montoNumerico,
      moneda,
      expenseType,
      category,
      subcategoria: category === STREAMING_CATEGORY && subcategoria ? subcategoria : undefined,
      recurringGroupId,
    }))

    // No llama a `onClose` acá a propósito: `onSubmit` dispara un alta/edición
    // async contra Supabase, y el padre es quien decide cuándo cerrar.
    onSubmit(expenses)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="flex h-full w-full max-w-sm flex-col gap-6 overflow-y-auto border-l border-line bg-panel p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">
            {isEditMode ? 'Editar gasto' : 'Cargar nuevo gasto'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-muted hover:bg-line hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Monto
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className={INPUT_CLASSNAME}
              />
              <select
                aria-label="Moneda"
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as Currency)}
                className="rounded-lg border border-line bg-app px-2 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Tipo
            <select value={expenseType} onChange={handleExpenseTypeChange} className={INPUT_CLASSNAME}>
              <option value="FIJO">Fijo</option>
              <option value="FLEXIBLE">Flexible</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Categoría
            <select value={category} onChange={handleCategoryChange} className={INPUT_CLASSNAME}>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          {category === STREAMING_CATEGORY && (
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              Servicio
              <StreamingServiceField
                value={subcategoria}
                onChange={setSubcategoria}
                services={streamingServices}
                onAddService={addStreamingService}
              />
            </label>
          )}

          {!isEditMode && expenseType === 'FIJO' && (
            <div className="flex flex-col gap-2 rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm text-ink-soft">
              <p>
                ¿Es un gasto fijo que se repite todos los meses (alquiler, luz, gimnasio)? Cargalo como servicio en el
                Centro de Pagos: queda con vencimiento, link de pago y lectura de factura por IA, y lo registrás mes
                a mes con el monto real.
              </p>
              <button
                type="button"
                onClick={() => {
                  onGoToPayments()
                  onClose()
                }}
                className="inline-flex items-center gap-1 self-start text-sm font-semibold text-accent hover:underline"
              >
                Ir al Centro de Pagos
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {!isEditMode && (
            <div className="flex flex-col gap-2 rounded-lg border border-line bg-app p-3">
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={isInstallment}
                  onChange={(e) => handleInstallmentToggle(e.target.checked)}
                  className="h-4 w-4 rounded border-line-strong bg-app text-accent focus:ring-accent"
                />
                Es compra en Cuotas
              </label>

              {isInstallment && (
                <label className="flex flex-col gap-1 text-sm text-ink-soft">
                  Cantidad total de cuotas
                  <input
                    type="number"
                    min="1"
                    max={MAX_REPEAT_MONTHS}
                    step="1"
                    value={installmentCount}
                    onChange={(e) => setInstallmentCount(e.target.value)}
                    className={INPUT_CLASSNAME}
                  />
                  <span className="text-xs text-faint">
                    Ej: "{(descripcion.trim() || category)} (Cuota 1/
                    {Math.min(Math.max(Number(installmentCount) || 1, 1), MAX_REPEAT_MONTHS)})", uno por mes.
                  </span>
                </label>
              )}
            </div>
          )}

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Fecha
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={INPUT_CLASSNAME}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Descripción
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Supermercado del mes"
              className={INPUT_CLASSNAME}
            />
          </label>

          <button
            type="submit"
            className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong"
          >
            {isEditMode ? 'Guardar cambios' : 'Guardar gasto'}
          </button>
        </form>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory, type ExpenseType } from '../../types/finance'
import type { Currency } from '../../types/money'
import { useFinanceStore } from '../../hooks/useFinanceStore'
import { addMonthsUTC, todayISODate } from '../../utils/finance'
import { DEFAULT_STREAMING_SERVICES } from '../../utils/streamingServices'
import { StreamingServiceField } from './StreamingServiceField'

interface ExpenseFormDrawerProps {
  isOpen: boolean
  onClose: () => void
  /** Puede ser más de un `Expense` si se cargó como gasto recurrente. */
  onSubmit: (expenses: Expense[]) => void
  /** Si se pasa, el formulario edita ese gasto; si no, carga uno nuevo. */
  initialExpense?: Expense
  /**
   * Precarga Tipo/Categoría al crear un gasto nuevo (ej: desde "Registrar
   * Pago" en el Centro de Pagos). Se ignora si `initialExpense` está presente.
   */
  prefill?: { expenseType: ExpenseType; category: ExpenseCategory }
}

const INPUT_CLASSNAME =
  'w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none'

const STREAMING_CATEGORY: ExpenseCategory = 'Streaming (Netflix, YT)'
const DEFAULT_EXPENSE_TYPE: ExpenseType = 'FIJO'
const DEFAULT_CATEGORY: ExpenseCategory = EXPENSE_CATEGORIES.FIJO[0]
/** Tope de meses que se pueden generar de una sola carga recurrente. */
const MAX_RECURRING_MONTHS = 24

function toDateInputValue(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function ExpenseFormDrawer({ isOpen, onClose, onSubmit, initialExpense, prefill }: ExpenseFormDrawerProps) {
  const isEditMode = Boolean(initialExpense)
  const { customStreamingServices, addStreamingService } = useFinanceStore()

  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<Currency>('ARS')
  const [expenseType, setExpenseType] = useState<ExpenseType>(DEFAULT_EXPENSE_TYPE)
  const [category, setCategory] = useState<ExpenseCategory>(DEFAULT_CATEGORY)
  const [subcategoria, setSubcategoria] = useState('')
  const [fecha, setFecha] = useState(todayISODate())
  const [descripcion, setDescripcion] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringMonths, setRecurringMonths] = useState('1')

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
      setFecha(toDateInputValue(initialExpense.fecha))
      setDescripcion(initialExpense.descripcion)
      // Editar un gasto puntual nunca dispara una nueva carga recurrente.
      setIsRecurring(false)
      setRecurringMonths('1')
    } else {
      setMonto('')
      setMoneda('ARS')
      setExpenseType(prefill?.expenseType ?? DEFAULT_EXPENSE_TYPE)
      setCategory(prefill?.category ?? DEFAULT_CATEGORY)
      setSubcategoria('')
      setFecha(todayISODate())
      setDescripcion('')
      setIsRecurring(false)
      setRecurringMonths('1')
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
    // El checkbox de recurrencia solo tiene sentido para Fijo: si se pasa a
    // Flexible, se apaga (no queda "activado" de forma invisible).
    if (nextType !== 'FIJO') {
      setIsRecurring(false)
      setRecurringMonths('1')
    }
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

    const baseExpense = {
      descripcion: descripcion.trim() || category,
      monto: montoNumerico,
      moneda,
      expenseType,
      category,
      subcategoria: category === STREAMING_CATEGORY && subcategoria ? subcategoria : undefined,
    }

    // Solo se repite al crear un gasto Fijo con el checkbox activado — nunca
    // al editar uno existente.
    const shouldRepeat = !isEditMode && expenseType === 'FIJO' && isRecurring
    const repeatCount = shouldRepeat
      ? Math.min(Math.max(Number(recurringMonths) || 1, 1), MAX_RECURRING_MONTHS)
      : 1
    // Todos los gastos de este lote comparten `recurringGroupId` (si hay más de uno).
    const recurringGroupId = repeatCount > 1 ? `rec-${Date.now()}` : undefined
    const baseDate = new Date(fecha)
    const batchTimestamp = Date.now()

    const expenses: Expense[] = Array.from({ length: repeatCount }, (_, index) => ({
      ...baseExpense,
      id: initialExpense?.id ?? `exp-${batchTimestamp}-${index}`,
      fecha: index === 0 ? baseDate : addMonthsUTC(baseDate, index),
      recurringGroupId,
    }))

    onSubmit(expenses)
    onClose()
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
            <div className="flex flex-col gap-2 rounded-lg border border-line bg-app p-3">
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="h-4 w-4 rounded border-line-strong bg-app text-accent focus:ring-accent"
                />
                Es un gasto recurrente
              </label>

              {isRecurring && (
                <label className="flex flex-col gap-1 text-sm text-ink-soft">
                  Repetir por X meses
                  <input
                    type="number"
                    min="1"
                    max={MAX_RECURRING_MONTHS}
                    step="1"
                    value={recurringMonths}
                    onChange={(e) => setRecurringMonths(e.target.value)}
                    className={INPUT_CLASSNAME}
                  />
                  <span className="text-xs text-faint">
                    Se van a crear {Math.min(Math.max(Number(recurringMonths) || 1, 1), MAX_RECURRING_MONTHS)} gastos
                    (uno por mes, hasta {MAX_RECURRING_MONTHS}).
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

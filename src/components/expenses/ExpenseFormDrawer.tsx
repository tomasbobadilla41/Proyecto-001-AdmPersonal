import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory, type ExpenseType } from '../../types/finance'
import type { Currency } from '../../types/money'
import { useFinanceStore } from '../../hooks/useFinanceStore'
import { todayISODate } from '../../utils/finance'
import { DEFAULT_STREAMING_SERVICES } from '../../utils/streamingServices'
import { StreamingServiceField } from './StreamingServiceField'

interface ExpenseFormDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (expense: Expense) => void
  /** Si se pasa, el formulario edita ese gasto; si no, carga uno nuevo. */
  initialExpense?: Expense
  /**
   * Precarga Tipo/Categoría al crear un gasto nuevo (ej: desde "Registrar
   * Pago" en el Centro de Pagos). Se ignora si `initialExpense` está presente.
   */
  prefill?: { expenseType: ExpenseType; category: ExpenseCategory }
}

const INPUT_CLASSNAME =
  'w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none'

const STREAMING_CATEGORY: ExpenseCategory = 'Streaming (Netflix, YT)'
const DEFAULT_EXPENSE_TYPE: ExpenseType = 'FIJO'
const DEFAULT_CATEGORY: ExpenseCategory = EXPENSE_CATEGORIES.FIJO[0]

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
    } else {
      setMonto('')
      setMoneda('ARS')
      setExpenseType(prefill?.expenseType ?? DEFAULT_EXPENSE_TYPE)
      setCategory(prefill?.category ?? DEFAULT_CATEGORY)
      setSubcategoria('')
      setFecha(todayISODate())
      setDescripcion('')
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

    onSubmit({
      id: initialExpense?.id ?? `exp-${Date.now()}`,
      fecha: new Date(fecha),
      descripcion: descripcion.trim() || category,
      monto: montoNumerico,
      moneda,
      expenseType,
      category,
      subcategoria: category === STREAMING_CATEGORY && subcategoria ? subcategoria : undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="flex h-full w-full max-w-sm flex-col gap-6 overflow-y-auto border-l border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">
            {isEditMode ? 'Editar gasto' : 'Cargar nuevo gasto'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-slate-300">
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
                className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Tipo
            <select value={expenseType} onChange={handleExpenseTypeChange} className={INPUT_CLASSNAME}>
              <option value="FIJO">Fijo</option>
              <option value="FLEXIBLE">Flexible</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-300">
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
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              Servicio
              <StreamingServiceField
                value={subcategoria}
                onChange={setSubcategoria}
                services={streamingServices}
                onAddService={addStreamingService}
              />
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Fecha
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={INPUT_CLASSNAME}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-300">
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
            className="mt-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
          >
            {isEditMode ? 'Guardar cambios' : 'Guardar gasto'}
          </button>
        </form>
      </div>
    </div>
  )
}

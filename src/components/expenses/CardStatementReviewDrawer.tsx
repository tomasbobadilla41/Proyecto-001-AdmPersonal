import { useEffect, useState, type ChangeEvent } from 'react'
import { X } from 'lucide-react'
import { EXPENSE_CATEGORIES, isFixedExpenseCategory, type Expense, type ExpenseCategory } from '../../types/finance'
import type { ParsedCardStatement } from '../../utils/cardStatementParser'
import { formatMoney } from '../../utils/currency'
import { formatDateAR, toDateOnlyUTC } from '../../utils/finance'

interface CardStatementReviewDrawerProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (expenses: Expense[]) => void
  parsed: ParsedCardStatement | null
}

interface ReviewRow {
  key: string
  included: boolean
  fecha: string
  descripcion: string
  category: ExpenseCategory
  monto: string
  cuotaActual?: number
  cuotaTotal?: number
}

const INPUT_CLASSNAME =
  'w-full rounded-lg border border-line bg-app px-2 py-1.5 text-sm text-ink focus:border-accent focus:outline-none'
const DEFAULT_CATEGORY: ExpenseCategory = 'Tarjeta de Crédito'
const RECONCILIATION_TOLERANCE = 0.01

function rowsFromParsed(parsed: ParsedCardStatement): ReviewRow[] {
  return parsed.items.map((item, index) => ({
    key: `${index}-${item.descripcion}`,
    included: true,
    fecha: toDateOnlyUTC(item.fecha),
    descripcion: item.descripcion,
    category: DEFAULT_CATEGORY,
    monto: String(item.monto),
    cuotaActual: item.cuotaActual,
    cuotaTotal: item.cuotaTotal,
  }))
}

/**
 * Revisión de los consumos leídos de un resumen de tarjeta antes de importarlos como
 * gastos — a diferencia de `ExpenseFormDrawer`, acá son N gastos independientes, no uno
 * solo (o un lote de cuotas idénticas). El banner de reconciliación recalcula en vivo
 * con cada edición/exclusión: es la forma de notar si el parseo del PDF se comió una
 * fila (ej: un resumen con más páginas) antes de guardar nada.
 */
export function CardStatementReviewDrawer({ isOpen, onClose, onConfirm, parsed }: CardStatementReviewDrawerProps) {
  const [rows, setRows] = useState<ReviewRow[]>([])

  useEffect(() => {
    if (isOpen && parsed) {
      setRows(rowsFromParsed(parsed))
    }
  }, [isOpen, parsed])

  if (!isOpen || !parsed) return null

  function updateRow(key: string, changes: Partial<ReviewRow>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...changes } : row)))
  }

  const includedRows = rows.filter((row) => row.included)
  const sumIncluded = includedRows.reduce((total, row) => total + (Number(row.monto) || 0), 0)
  const delta = sumIncluded - parsed.totalDeclarado
  const reconciles = Math.abs(delta) < RECONCILIATION_TOLERANCE

  function handleConfirm() {
    const batchTimestamp = Date.now()
    const expenses: Expense[] = includedRows.map((row, index) => ({
      id: `exp-${batchTimestamp}-${index}`,
      fecha: new Date(row.fecha),
      descripcion:
        row.cuotaActual && row.cuotaTotal ? `${row.descripcion} (Cuota ${row.cuotaActual}/${row.cuotaTotal})` : row.descripcion,
      monto: Number(row.monto),
      moneda: 'ARS',
      expenseType: isFixedExpenseCategory(row.category) ? 'FIJO' : 'FLEXIBLE',
      category: row.category,
    }))
    onConfirm(expenses)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="flex h-full w-full max-w-3xl flex-col gap-4 overflow-y-auto border-l border-line bg-panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink">Revisar consumos de tarjeta</h3>
            {(parsed.cierre || parsed.vencimiento) && (
              <p className="text-xs text-muted">
                {parsed.cierre && `Cierre ${formatDateAR(parsed.cierre)}`}
                {parsed.cierre && parsed.vencimiento && ' · '}
                {parsed.vencimiento && `Vencimiento ${formatDateAR(parsed.vencimiento)}`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-muted hover:bg-line hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={`rounded-lg border p-3 text-sm ${
            reconciles ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
          }`}
        >
          {reconciles ? (
            <>✓ Coincide con el total del resumen ({formatMoney({ amount: parsed.totalDeclarado, currency: 'ARS' })}).</>
          ) : (
            <>
              ⚠ No coincide con el total del resumen ({formatMoney({ amount: parsed.totalDeclarado, currency: 'ARS' })}) — diferencia de{' '}
              {formatMoney({ amount: delta, currency: 'ARS' })}. Revisá los montos antes de confirmar.
            </>
          )}
        </div>

        <p className="text-xs text-faint">Esta primera versión no lee consumos en dólares.</p>

        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div
              key={row.key}
              className={`grid grid-cols-[auto_1fr_1fr_1fr_8rem] items-center gap-2 rounded-lg border border-line p-2 ${
                row.included ? '' : 'opacity-50'
              }`}
            >
              <input
                type="checkbox"
                checked={row.included}
                onChange={(e) => updateRow(row.key, { included: e.target.checked })}
                className="h-4 w-4 rounded border-line-strong bg-app text-accent focus:ring-accent"
                aria-label="Incluir este consumo"
              />

              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={row.descripcion}
                  onChange={(e) => updateRow(row.key, { descripcion: e.target.value })}
                  className={INPUT_CLASSNAME}
                />
                {row.cuotaActual && row.cuotaTotal && (
                  <span className="text-xs text-faint">Cuota {row.cuotaActual}/{row.cuotaTotal}</span>
                )}
              </div>

              <input
                type="date"
                value={row.fecha}
                onChange={(e) => updateRow(row.key, { fecha: e.target.value })}
                className={INPUT_CLASSNAME}
              />

              <select
                value={row.category}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => updateRow(row.key, { category: e.target.value as ExpenseCategory })}
                className={INPUT_CLASSNAME}
              >
                <optgroup label="Flexible">
                  {EXPENSE_CATEGORIES.FLEXIBLE.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Fijo">
                  {EXPENSE_CATEGORIES.FIJO.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </optgroup>
              </select>

              <input
                type="number"
                min="0"
                step="0.01"
                value={row.monto}
                onChange={(e) => updateRow(row.key, { monto: e.target.value })}
                className={INPUT_CLASSNAME}
              />
            </div>
          ))}
        </div>

        <div className="mt-auto flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:bg-line"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={includedRows.length === 0}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirmar e importar ({includedRows.length})
          </button>
        </div>
      </div>
    </div>
  )
}

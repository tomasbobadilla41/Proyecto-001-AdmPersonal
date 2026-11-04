import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { ChevronDown, CreditCard, FileText, Loader2, Plus, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { isFixedExpenseCategory, type Expense, type ExpenseCategory, type ExpenseType } from '../types/finance'
import { ExpenseTypeFilter, type ExpenseTypeFilterValue } from '../components/expenses/ExpenseTypeFilter'
import { ExpenseMonthSummary } from '../components/expenses/ExpenseMonthSummary'
import { ExpenseList } from '../components/expenses/ExpenseList'
import { DeleteExpenseDialog } from '../components/expenses/DeleteExpenseDialog'
import { MonthNavigator } from '../components/common/MonthNavigator'
import { ExpenseFormDrawer } from '../components/expenses/ExpenseFormDrawer'
import { CardStatementReviewDrawer } from '../components/expenses/CardStatementReviewDrawer'
import { FloatingActionButton } from '../components/common/FloatingActionButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { useExchangeRateStore } from '../hooks/useExchangeRateStore'
import { useExpenseStore } from '../hooks/useExpenseStore'
import { parseInvoicePdf } from '../services/parseInvoiceApi'
import { parseCardStatement, type ParsedCardStatement } from '../utils/cardStatementParser'
import { extractPdfText } from '../utils/pdfText'
import { MAX_PDF_SIZE_BYTES } from '../utils/pdfFile'
import { getExchangeRate } from '../utils/finance'

type ExpenseFormState = { mode: 'create' } | { mode: 'edit'; expense: Expense } | null
type InvoicePrefill = { expenseType: ExpenseType; category?: ExpenseCategory; monto?: number }

interface ExpensesPageProps {
  /** Lleva al Centro de Pagos — usado por el aviso de "gasto fijo que se repite" dentro del formulario de carga. */
  onGoToPayments: () => void
}

export function ExpensesPage({ onGoToPayments }: ExpensesPageProps) {
  const { exchangeRates } = useExchangeRateStore()
  const { expenses, isLoading, addExpenses, updateExpense, removeExpense } = useExpenseStore()
  const [formState, setFormState] = useState<ExpenseFormState>(null)
  // Monto/categoría detectados al subir una factura (PDF) — precargan el
  // formulario de carga, que hace de pantalla de revisión: nada se guarda
  // hasta que confirmes "Guardar gasto" ahí.
  const [invoicePrefill, setInvoicePrefill] = useState<InvoicePrefill | undefined>(undefined)
  const [isReadingInvoice, setIsReadingInvoice] = useState(false)
  const invoiceInputRef = useRef<HTMLInputElement>(null)

  // Resumen de tarjeta: a diferencia de la factura (un monto), acá se leen varios
  // consumos — se revisan en `CardStatementReviewDrawer`, no en `ExpenseFormDrawer`.
  const [cardStatementData, setCardStatementData] = useState<ParsedCardStatement | null>(null)
  const [isReadingCardStatement, setIsReadingCardStatement] = useState(false)
  const cardStatementInputRef = useRef<HTMLInputElement>(null)

  // Arranca en el mes calendario real de hoy — igual que el Dashboard —, no
  // en el mes del gasto "más reciente" cargado. Con cuotas/recurrencia una
  // sola carga puede generar meses varios meses hacia el futuro, así que
  // "más reciente" podía terminar siendo, por ej., la última cuota (a 6
  // meses de hoy) y esta pantalla se abría ahí sin avisar.
  const [mes, setMes] = useState(() => new Date().getMonth() + 1)
  const [anio, setAnio] = useState(() => new Date().getFullYear())
  const [tipoFiltro, setTipoFiltro] = useState<ExpenseTypeFilterValue>('TODOS')
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)

  const tipoCambio = getExchangeRate(exchangeRates, mes, anio)

  // Sin el filtro de Tipo — el resumen Fijos vs Flexibles necesita los dos
  // tipos siempre presentes para comparar; si le pasáramos `filteredExpenses`
  // ya filtrado por tipo, se mostraría 100%/0% en vez de la comparación real.
  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.fecha.getUTCMonth() + 1 === mes && e.fecha.getUTCFullYear() === anio),
    [expenses, mes, anio],
  )

  const filteredExpenses = useMemo(
    () =>
      monthExpenses
        .filter((e) => tipoFiltro === 'TODOS' || e.expenseType === tipoFiltro)
        .sort((a, b) => b.fecha.getTime() - a.fecha.getTime()),
    [monthExpenses, tipoFiltro],
  )

  function handleConfirmDelete(expense: Expense) {
    void removeExpense(expense.id)
    setExpenseToDelete(null)
  }

  function handleMonthChange(nextMes: number, nextAnio: number) {
    setMes(nextMes)
    setAnio(nextAnio)
  }

  const isImporting = isReadingInvoice || isReadingCardStatement

  function handleSubmit(expenses: Expense[]) {
    if (formState?.mode === 'edit') {
      void updateExpense(expenses[0])
    } else {
      void addExpenses(expenses)
    }
    setFormState(null)
    setInvoicePrefill(undefined)
  }

  function handleCloseForm() {
    setFormState(null)
    setInvoicePrefill(undefined)
  }

  async function handleInvoiceFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setIsReadingInvoice(true)
    try {
      const data = await parseInvoicePdf(file)
      setInvoicePrefill({
        expenseType: 'FIJO',
        category: isFixedExpenseCategory(data.categoria_sugerida) ? data.categoria_sugerida : undefined,
        monto: data.monto_total,
      })
      setFormState({ mode: 'create' })
      toast.success('Factura leída — revisá los datos antes de guardar.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al leer la factura. Probá de nuevo en unos segundos.')
    } finally {
      setIsReadingInvoice(false)
    }
  }

  async function handleCardStatementFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Solo se admiten archivos PDF.')
      return
    }
    if (file.size > MAX_PDF_SIZE_BYTES) {
      toast.error('El PDF supera el tamaño máximo permitido (10 MB).')
      return
    }

    setIsReadingCardStatement(true)
    try {
      const text = await extractPdfText(file)
      const parsed = parseCardStatement(text)
      if (!parsed) {
        toast.error('No reconocimos el formato de este resumen de tarjeta.')
        return
      }
      setCardStatementData(parsed)
      toast.success('Resumen leído — revisá los consumos antes de importar.')
    } catch {
      toast.error('Error al leer el resumen. Probá de nuevo en unos segundos.')
    } finally {
      setIsReadingCardStatement(false)
    }
  }

  function handleCardStatementConfirm(expenses: Expense[]) {
    void addExpenses(expenses)
    setCardStatementData(null)
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Gastos</h2>

        {/* Las dos importaciones de PDF en un solo botón: son acciones ocasionales,
            no merecen dos botones grandes en el encabezado. */}
        <input ref={invoiceInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleInvoiceFileChange} />
        <input
          ref={cardStatementInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleCardStatementFileChange}
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={isImporting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium text-ink-soft outline-none transition-colors hover:bg-line focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isReadingInvoice ? 'Leyendo factura…' : isReadingCardStatement ? 'Leyendo resumen…' : 'Importar'}
            {!isImporting && <ChevronDown className="h-3.5 w-3.5 text-faint" />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem onClick={() => invoiceInputRef.current?.click()}>
              <FileText className="h-4 w-4" />
              Factura de servicio (PDF)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => cardStatementInputRef.current?.click()}>
              <CreditCard className="h-4 w-4" />
              Resumen de tarjeta (PDF)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNavigator mes={mes} anio={anio} onChange={handleMonthChange} />
        <ExpenseTypeFilter value={tipoFiltro} onChange={setTipoFiltro} />
      </div>

      <ExpenseMonthSummary expenses={monthExpenses} tipoCambio={tipoCambio} />

      <ExpenseList
        expenses={filteredExpenses}
        isLoading={isLoading}
        emptyMessage={
          tipoFiltro === 'TODOS'
            ? 'No hay gastos cargados para este mes.'
            : `No hay gastos ${tipoFiltro === 'FIJO' ? 'fijos' : 'flexibles'} cargados para este mes.`
        }
        onEdit={(expense) => setFormState({ mode: 'edit', expense })}
        onDelete={setExpenseToDelete}
      />

      <FloatingActionButton icon={Plus} label="Cargar gasto" onClick={() => setFormState({ mode: 'create' })} />
      <ExpenseFormDrawer
        isOpen={formState !== null}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        initialExpense={formState?.mode === 'edit' ? formState.expense : undefined}
        prefill={formState?.mode === 'create' ? invoicePrefill : undefined}
        onGoToPayments={onGoToPayments}
      />
      <CardStatementReviewDrawer
        isOpen={cardStatementData !== null}
        onClose={() => setCardStatementData(null)}
        onConfirm={handleCardStatementConfirm}
        parsed={cardStatementData}
        existingExpenses={expenses}
      />
      <DeleteExpenseDialog
        expense={expenseToDelete}
        onCancel={() => setExpenseToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

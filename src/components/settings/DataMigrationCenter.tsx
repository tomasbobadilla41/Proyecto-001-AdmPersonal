import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Download, FileSpreadsheet, FileText, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useExpenseStore } from '../../hooks/useExpenseStore'
import {
  downloadExpenseCsvTemplate,
  exportExpensesToCsv,
  exportExpensesToPdf,
  importExpensesFromCsv,
} from '../../utils/expenseImportExport'

/** Máxima cantidad de errores de fila que se muestran en un toast (el resto queda contado, no listado). */
const MAX_ERROR_MESSAGES = 4

export function DataMigrationCenter() {
  const { expenses, addExpenses } = useExpenseStore()
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleExportCsv() {
    if (expenses.length === 0) {
      toast.error('No hay gastos cargados para exportar.')
      return
    }
    exportExpensesToCsv(expenses)
    toast.success(`Se exportaron ${expenses.length} gastos a CSV.`)
  }

  function handleExportPdf() {
    if (expenses.length === 0) {
      toast.error('No hay gastos cargados para exportar.')
      return
    }
    exportExpensesToPdf(expenses)
    toast.success(`Se generó el PDF con ${expenses.length} gastos.`)
  }

  function summarizeErrors(errors: string[]): string {
    const shown = errors.slice(0, MAX_ERROR_MESSAGES).join(' ')
    const rest = errors.length - MAX_ERROR_MESSAGES
    return rest > 0 ? `${shown} (+${rest} error${rest === 1 ? '' : 'es'} más)` : shown
  }

  async function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('El archivo debe ser un .csv.')
      return
    }

    setIsImporting(true)
    try {
      const { expenses: imported, errors } = await importExpensesFromCsv(file)

      if (imported.length === 0) {
        toast.error(`No se pudo importar ningún gasto. ${summarizeErrors(errors)}`)
        return
      }

      const saved = await addExpenses(imported)
      if (!saved) return // el store ya mostró su propio toast de error

      if (errors.length === 0) {
        toast.success(`Se importaron ${imported.length} gastos correctamente.`)
      } else {
        toast.error(
          `Se importaron ${imported.length} gastos. ${errors.length} fila(s) omitida(s): ${summarizeErrors(errors)}`,
        )
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ocurrió un error al leer el archivo.')
    } finally {
      setIsImporting(false)
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void processFile(file)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(true)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void processFile(file)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-ink">Centro de Migración de Datos</h3>
        <p className="text-sm text-muted">Exportá tu historial de gastos o importá gastos desde un archivo CSV.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Exportar</CardTitle>
            <CardDescription>Descargá tu historial completo de gastos.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button variant="outline" className="justify-start gap-3" onClick={handleExportCsv}>
              <FileSpreadsheet className="h-4 w-4" />
              Exportar a Excel (CSV)
            </Button>
            <Button variant="outline" className="justify-start gap-3" onClick={handleExportPdf}>
              <FileText className="h-4 w-4" />
              Exportar a PDF
            </Button>
            <p className="text-xs text-muted-foreground">{expenses.length} gasto(s) en total.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Importar Excel (CSV)</CardTitle>
            <CardDescription>Sumá gastos nuevos sin borrar los que ya tenés cargados.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              type="button"
              variant="link"
              className="h-auto self-start p-0"
              onClick={downloadExpenseCsvTemplate}
            >
              <Download className="h-3.5 w-3.5" />
              Descargar plantilla CSV
            </Button>

            <div
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-input bg-background'
              }`}
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Arrastrá tu archivo .csv acá, o{' '}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 align-baseline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                >
                  elegilo manualmente
                </Button>
                .
              </p>
              <p className="text-xs text-muted-foreground">
                Columnas: Fecha, Descripcion, Categoria, Monto, Moneda, Tipo (FIJO/FLEXIBLE).
              </p>
              {isImporting && <p className="text-xs font-medium text-primary">Procesando archivo...</p>}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Importar CSV de gastos"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import Papa from 'papaparse'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory, type ExpenseType } from '../types/finance'
import type { Currency } from '../types/money'
import { formatDateAR } from './finance'

/**
 * Encabezados del CSV de import/export. Se usan sin tildes (coinciden con la
 * plantilla que se descarga) para que exportar y volver a importar el mismo
 * archivo funcione siempre, sin depender de cómo cada app normalice acentos.
 */
const CSV_HEADERS = ['Fecha', 'Descripcion', 'Categoria', 'Monto', 'Moneda', 'Tipo'] as const
type CsvHeader = (typeof CSV_HEADERS)[number]

/** `Moneda` es la única columna opcional (si falta, se asume ARS). */
const REQUIRED_HEADERS: readonly CsvHeader[] = ['Fecha', 'Descripcion', 'Categoria', 'Monto', 'Tipo']

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function expenseToRow(expense: Expense): Record<CsvHeader, string> {
  return {
    Fecha: formatDateAR(expense.fecha),
    Descripcion: expense.descripcion,
    Categoria: expense.category,
    Monto: expense.monto.toFixed(2),
    Moneda: expense.moneda,
    Tipo: expense.expenseType,
  }
}

function buildCsv(rows: Array<Record<CsvHeader, string>>): string {
  return Papa.unparse({ fields: [...CSV_HEADERS], data: rows.map((row) => CSV_HEADERS.map((header) => row[header])) })
}

/** Descarga el historial de gastos como .csv. Lleva BOM para que Excel/Windows respete tildes y "ñ". */
export function exportExpensesToCsv(expenses: Expense[]): void {
  const csv = buildCsv(expenses.map(expenseToRow))
  triggerDownload('gastos.csv', new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
}

/** Descarga una plantilla .csv vacía (solo encabezados) para cargar gastos por import. */
export function downloadExpenseCsvTemplate(): void {
  const csv = buildCsv([])
  triggerDownload('plantilla-gastos.csv', new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
}

/** Genera y descarga un PDF con título, fecha de generación y una tabla con el historial de gastos. */
export function exportExpensesToPdf(expenses: Expense[]): void {
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.text('Historial de Gastos', 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(120)
  doc.text(`Generado el ${formatDateAR(new Date())}`, 14, 25)

  autoTable(doc, {
    startY: 30,
    head: [['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto']],
    body: expenses.map((expense) => [
      formatDateAR(expense.fecha),
      expense.descripcion,
      expense.category,
      expense.expenseType === 'FIJO' ? 'Fijo' : 'Flexible',
      `${expense.moneda === 'USD' ? 'US$' : '$'} ${expense.monto.toFixed(2)}`,
    ]),
    headStyles: { fillColor: [16, 185, 129] },
    styles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  })

  doc.save('gastos.pdf')
}

function buildUtcDate(year: number, month: number, day: number): Date | null {
  const date = new Date(Date.UTC(year, month - 1, day))
  const isValid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return isValid ? date : null
}

/** Acepta 'dd/mm/aaaa' (formato que usa el resto de la app) y 'aaaa-mm-dd' (ISO). */
function parseImportDate(value: string): Date | null {
  const trimmed = value.trim()

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed)
  if (isoMatch) {
    return buildUtcDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]))
  }

  const arMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)
  if (arMatch) {
    return buildUtcDate(Number(arMatch[3]), Number(arMatch[2]), Number(arMatch[1]))
  }

  return null
}

/** Acepta '1234.56' (punto decimal), '1234,56' (coma decimal) y '1.234,56' (miles + coma decimal). */
function parseImportAmount(value: string): number | null {
  const trimmed = value.trim().replace(/\$|\s/g, '')
  if (!trimmed) return null

  const normalized =
    trimmed.includes(',') && !trimmed.includes('.') ? trimmed.replace(',', '.') : trimmed.replace(/,/g, '')

  const amount = Number(normalized)
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

/** Vacío se interpreta como ARS (moneda por defecto de la app); cualquier otro valor debe ser ARS o USD. */
function parseImportCurrency(value: string): Currency | null {
  const trimmed = value.trim().toUpperCase()
  if (!trimmed) return 'ARS'
  return trimmed === 'ARS' || trimmed === 'USD' ? trimmed : null
}

function parseImportExpenseType(value: string): ExpenseType | null {
  const trimmed = value.trim().toUpperCase()
  return trimmed === 'FIJO' || trimmed === 'FLEXIBLE' ? trimmed : null
}

/** Matchea sin importar mayúsculas/minúsculas, pero devuelve la categoría con el casing canónico. */
function parseImportCategory(value: string, expenseType: ExpenseType): ExpenseCategory | null {
  const trimmed = value.trim().toLowerCase()
  const match = EXPENSE_CATEGORIES[expenseType].find((category) => category.toLowerCase() === trimmed)
  return match ?? null
}

export interface ImportExpensesResult {
  expenses: Expense[]
  /** Mensajes describiendo cada fila que no se pudo importar (fila omitida, no bloquea el resto). */
  errors: string[]
}

/**
 * Parsea y valida un CSV de gastos. Las columnas requeridas se validan una
 * sola vez (si falta alguna, rechaza la promesa); cada fila se valida por
 * separado y las inválidas se omiten (se reportan en `errors`) sin frenar la
 * importación del resto.
 */
export function importExpensesFromCsv(file: File): Promise<ImportExpensesResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (result) => {
        const fields = result.meta.fields ?? []
        const missingHeaders = REQUIRED_HEADERS.filter((header) => !fields.includes(header))
        if (missingHeaders.length > 0) {
          reject(new Error(`Faltan columnas requeridas en el CSV: ${missingHeaders.join(', ')}.`))
          return
        }

        const errors: string[] = []
        const expenses: Expense[] = []
        const batchTimestamp = Date.now()

        result.data.forEach((row, index) => {
          const rowNumber = index + 2 // fila 1 = encabezados

          const expenseType = parseImportExpenseType(row.Tipo ?? '')
          if (!expenseType) {
            errors.push(`Fila ${rowNumber}: "Tipo" debe ser FIJO o FLEXIBLE.`)
            return
          }

          const fecha = parseImportDate(row.Fecha ?? '')
          if (!fecha) {
            errors.push(`Fila ${rowNumber}: "Fecha" inválida (usar dd/mm/aaaa o aaaa-mm-dd).`)
            return
          }

          const monto = parseImportAmount(row.Monto ?? '')
          if (!monto) {
            errors.push(`Fila ${rowNumber}: "Monto" debe ser un número mayor a 0.`)
            return
          }

          const moneda = parseImportCurrency(row.Moneda ?? '')
          if (!moneda) {
            errors.push(`Fila ${rowNumber}: "Moneda" debe ser ARS o USD.`)
            return
          }

          const category = parseImportCategory(row.Categoria ?? '', expenseType)
          if (!category) {
            errors.push(`Fila ${rowNumber}: "Categoria" inválida para el Tipo ${expenseType}.`)
            return
          }

          const descripcion = (row.Descripcion ?? '').trim()
          if (!descripcion) {
            errors.push(`Fila ${rowNumber}: falta "Descripcion".`)
            return
          }

          expenses.push({
            id: `imp-${batchTimestamp}-${index}`,
            fecha,
            descripcion,
            monto,
            moneda,
            expenseType,
            category,
          })
        })

        resolve({ expenses, errors })
      },
      error: (error: Error) => reject(error),
    })
  })
}

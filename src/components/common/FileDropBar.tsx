import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { FileText, Loader2, type LucideIcon } from 'lucide-react'

interface FileDropBarProps {
  /** Atributo `accept` del input (ej: "application/pdf", ".csv"). */
  accept: string
  onFile: (file: File) => void
  isProcessing: boolean
  /** Texto principal: "Arrastrá una factura PDF". */
  title: string
  /** Texto secundario: "o hacé clic — detectamos el servicio y el monto." */
  hint: string
  processingLabel: string
  icon: LucideIcon
  /**
   * 'bar': una línea (cuando subir archivos es una acción ocasional).
   * 'hero': recuadro grande centrado (cuando es la acción principal, ej: pantalla vacía).
   */
  variant?: 'bar' | 'hero'
  ariaLabel: string
}

/**
 * Zona de "arrastrá o hacé clic" para subir un archivo, accesible con
 * teclado (Enter / Espacio). La usan el Centro de Pagos (facturas PDF) y
 * Suscripciones (CSV de impuestito.com).
 */
export function FileDropBar({
  accept,
  onFile,
  isProcessing,
  title,
  hint,
  processingLabel,
  icon: Icon,
  variant = 'bar',
  ariaLabel,
}: FileDropBarProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function openPicker() {
    if (!isProcessing) fileInputRef.current?.click()
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDraggingOver(false)
    const file = event.dataTransfer.files?.[0]
    if (file && !isProcessing) onFile(file)
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) onFile(file)
  }

  const StatusIcon = isProcessing ? Loader2 : isDraggingOver ? FileText : Icon
  const isHero = variant === 'hero'

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-busy={isProcessing}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openPicker()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDraggingOver(true)
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer rounded-xl border border-dashed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
        isHero ? 'flex-col items-center gap-2 px-6 py-10 text-center' : 'items-center gap-3 px-4 py-3'
      } ${isDraggingOver ? 'border-accent bg-accent/5' : 'border-line-strong hover:border-accent/60 hover:bg-line/30'}`}
    >
      <input ref={fileInputRef} type="file" accept={accept} className="hidden" onChange={handleFileInputChange} />

      <StatusIcon className={`shrink-0 text-accent-text ${isHero ? 'h-6 w-6' : 'h-4 w-4'} ${isProcessing ? 'animate-spin' : ''}`} />

      {isProcessing ? (
        <p className="text-sm text-ink-soft">{processingLabel}</p>
      ) : isHero ? (
        <>
          <p className="text-sm font-medium text-ink">{title}</p>
          <p className="text-xs text-muted">{hint}</p>
        </>
      ) : (
        <p className="text-sm">
          <span className="font-medium text-ink">{title}</span>
          <span className="text-muted"> {hint}</span>
        </p>
      )}
    </div>
  )
}

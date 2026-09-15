import { useState, type ChangeEvent, type KeyboardEvent } from 'react'

interface StreamingServiceFieldProps {
  value: string
  onChange: (value: string) => void
  services: string[]
  onAddService: (service: string) => void
}

const NEW_SERVICE_VALUE = '__new__'

const FIELD_CLASSNAME =
  'w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none'

/** Selector de "qué servicio" dentro de una categoría (ej: Streaming → Netflix), con opción de agregar uno nuevo. */
export function StreamingServiceField({ value, onChange, services, onAddService }: StreamingServiceFieldProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newService, setNewService] = useState('')

  function handleSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    if (event.target.value === NEW_SERVICE_VALUE) {
      setNewService('')
      setIsAdding(true)
      return
    }
    onChange(event.target.value)
  }

  function confirmNewService() {
    const trimmed = newService.trim()
    if (!trimmed) {
      setIsAdding(false)
      return
    }
    onAddService(trimmed)
    onChange(trimmed)
    setIsAdding(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      confirmNewService()
    }
  }

  if (isAdding) {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          autoFocus
          value={newService}
          onChange={(e) => setNewService(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ej: Paramount+"
          className={FIELD_CLASSNAME}
        />
        <button
          type="button"
          onClick={confirmNewService}
          className="shrink-0 rounded-lg bg-accent px-3 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong"
        >
          Agregar
        </button>
        <button
          type="button"
          onClick={() => setIsAdding(false)}
          className="shrink-0 rounded-lg border border-line px-3 text-sm text-muted transition-colors hover:bg-line"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <select value={value} onChange={handleSelectChange} className={FIELD_CLASSNAME}>
      <option value="" disabled>
        Elegí un servicio…
      </option>
      {services.map((service) => (
        <option key={service} value={service}>
          {service}
        </option>
      ))}
      <option value={NEW_SERVICE_VALUE}>+ Agregar nuevo…</option>
    </select>
  )
}

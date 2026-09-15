import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { Property } from '../../types/realEstate'

interface PropertyFormDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (property: Property) => void
  /** Si se pasa, el formulario edita esa propiedad; si no, agrega una nueva. */
  initialProperty?: Property
}

const INPUT_CLASSNAME =
  'w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none'

export function PropertyFormDrawer({ isOpen, onClose, onSubmit, initialProperty }: PropertyFormDrawerProps) {
  const isEditMode = Boolean(initialProperty)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')

  useEffect(() => {
    if (!isOpen) return
    if (initialProperty) {
      setName(initialProperty.name)
      setAddress(initialProperty.address)
    } else {
      setName('')
      setAddress('')
    }
  }, [isOpen, initialProperty])

  if (!isOpen) return null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !address.trim()) return

    onSubmit({
      id: initialProperty?.id ?? `prop-${Date.now()}`,
      name: name.trim(),
      address: address.trim(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="flex h-full w-full max-w-sm flex-col gap-6 overflow-y-auto border-l border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">
            {isEditMode ? 'Editar propiedad' : 'Agregar propiedad'}
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
            Nombre
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ej: "Balcarce 319"'
              className={INPUT_CLASSNAME}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Dirección
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej: Balcarce 319, CABA"
              className={INPUT_CLASSNAME}
            />
          </label>

          <button
            type="submit"
            className="mt-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
          >
            {isEditMode ? 'Guardar cambios' : 'Guardar propiedad'}
          </button>
        </form>
      </div>
    </div>
  )
}

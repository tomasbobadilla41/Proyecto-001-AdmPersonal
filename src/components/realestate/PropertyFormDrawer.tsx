import { useEffect, useState, type FormEvent } from 'react'
import type { Property } from '../../types/realEstate'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'

interface PropertyFormDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (property: Property) => void
  /** Si se pasa, el formulario edita esa propiedad; si no, agrega una nueva. */
  initialProperty?: Property
}

const INPUT_CLASSNAME =
  'w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none'

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


  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !address.trim()) return

    // No llama a `onClose` acá a propósito: `onSubmit` dispara un alta/edición
    // async contra Supabase, y el padre es quien decide cuándo cerrar (ver
    // ServiceConfigFormDrawer para el bug real que este patrón evitó).
    onSubmit({
      id: initialProperty?.id ?? `prop-${Date.now()}`,
      name: name.trim(),
      address: address.trim(),
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar propiedad' : 'Agregar propiedad'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
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

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
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
            className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong"
          >
            {isEditMode ? 'Guardar cambios' : 'Guardar propiedad'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

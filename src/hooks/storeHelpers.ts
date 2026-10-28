import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'

/** Reemplaza el elemento con ese `id` en el array, o lo deja igual si no lo encuentra. */
export function replaceById<T extends { id: string }>(items: T[], updated: T): T[] {
  return items.map((item) => (item.id === updated.id ? updated : item))
}

/**
 * Patrón repetido en todos los stores de Supabase para agregar un item:
 * pegarle a la API, agregar la respuesta real (no un dato optimista) al
 * estado local, y mostrar un toast + devolver `false` si falla — en vez de
 * relanzar, para que el formulario que llamó decida qué hacer (ej: no cerrar
 * el drawer si falló).
 */
export function useAddAction<T extends { id: string }>(
  setItems: Dispatch<SetStateAction<T[]>>,
  userId: string | undefined,
  insertFn: (item: T, userId: string) => Promise<T>,
  errorMessage: string,
) {
  return useCallback(
    async (item: T) => {
      if (!userId) return false
      try {
        const inserted = await insertFn(item, userId)
        setItems((prev) => [...prev, inserted])
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : errorMessage)
        return false
      }
    },
    [userId, insertFn, setItems, errorMessage],
  )
}

/** Mismo patrón que {@link useAddAction}, para actualizar un item existente (mismo `id`). */
export function useUpdateAction<T extends { id: string }>(
  setItems: Dispatch<SetStateAction<T[]>>,
  userId: string | undefined,
  updateFn: (item: T, userId: string) => Promise<T>,
  errorMessage: string,
) {
  return useCallback(
    async (item: T) => {
      if (!userId) return false
      try {
        const updated = await updateFn(item, userId)
        setItems((prev) => replaceById(prev, updated))
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : errorMessage)
        return false
      }
    },
    [userId, updateFn, setItems, errorMessage],
  )
}

/** Mismo patrón que {@link useAddAction}, para borrar un item por `id`. */
export function useRemoveAction<T extends { id: string }>(
  setItems: Dispatch<SetStateAction<T[]>>,
  removeFn: (id: string) => Promise<void>,
  errorMessage: string,
) {
  return useCallback(
    async (id: string) => {
      try {
        await removeFn(id)
        setItems((prev) => prev.filter((item) => item.id !== id))
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : errorMessage)
        return false
      }
    },
    [removeFn, setItems, errorMessage],
  )
}

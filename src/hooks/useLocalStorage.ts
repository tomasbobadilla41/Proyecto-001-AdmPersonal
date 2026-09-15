import { useEffect, useRef, useState } from 'react'

interface UseLocalStorageOptions<T> {
  serialize?: (value: T) => string
  deserialize?: (raw: string) => T
}

/**
 * Sincroniza un estado de React con `localStorage` bajo `key`.
 *
 * Lee de forma síncrona en el primer render (el valor persistido está
 * disponible desde el primer pintado, sin parpadeo). Si `localStorage` no
 * está disponible o el contenido guardado es inválido (modo privado, cuota
 * llena, JSON corrupto), cae en `initialValue` sin romper la app.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions<T> = {},
) {
  // Refs para no tener que exigir identidad estable de serialize/deserialize
  // entre renders (evita relecturas/reescrituras de más si el caller pasa
  // funciones inline).
  const serializeRef = useRef(options.serialize ?? ((value: T) => JSON.stringify(value)))
  const deserializeRef = useRef(options.deserialize ?? ((raw: string) => JSON.parse(raw) as T))
  serializeRef.current = options.serialize ?? serializeRef.current
  deserializeRef.current = options.deserialize ?? deserializeRef.current

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw !== null ? deserializeRef.current(raw) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, serializeRef.current(value))
    } catch {
      // Sin persistencia disponible: la app sigue funcionando solo en memoria.
    }
  }, [key, value])

  return [value, setValue] as const
}

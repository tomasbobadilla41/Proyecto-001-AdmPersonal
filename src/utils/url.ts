/**
 * Un link guardado como `javascript:...` se ejecutaría al hacer clic en un
 * `<a href>`. El `<input type="url">` del formulario ya ayuda, pero no es
 * garantía si el dato vino de otro lado (import, API) — por eso se valida
 * también al renderizar.
 */
export function isSafeHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

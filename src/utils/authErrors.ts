/**
 * Traduce los errores de Supabase Auth (que llegan en inglés) a mensajes en
 * español para mostrar en los toasts. Se matchea por `code` cuando existe y,
 * como respaldo, por fragmentos del mensaje original.
 */
const MESSAGES_BY_CODE: Record<string, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Todavía no confirmaste tu correo. Revisá tu bandeja de entrada.',
  user_already_exists: 'Ya existe una cuenta con ese correo.',
  email_exists: 'Ya existe una cuenta con ese correo.',
  weak_password: 'La contraseña es demasiado débil. Usá al menos 8 caracteres combinando letras y números.',
  over_email_send_rate_limit: 'Enviamos demasiados correos seguidos. Esperá unos minutos e intentá de nuevo.',
  over_request_rate_limit: 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.',
  signup_disabled: 'El registro de cuentas nuevas está deshabilitado.',
  email_address_invalid: 'El correo electrónico no es válido.',
  same_password: 'La nueva contraseña tiene que ser distinta a la anterior.',
}

const MESSAGES_BY_TEXT: Array<[RegExp, string]> = [
  [/invalid login credentials/i, MESSAGES_BY_CODE.invalid_credentials],
  [/email not confirmed/i, MESSAGES_BY_CODE.email_not_confirmed],
  [/already registered|already exists/i, MESSAGES_BY_CODE.user_already_exists],
  [/password should be|weak password/i, MESSAGES_BY_CODE.weak_password],
  [/rate limit|too many/i, MESSAGES_BY_CODE.over_request_rate_limit],
  [/signups not allowed/i, MESSAGES_BY_CODE.signup_disabled],
  [/failed to fetch|network/i, 'No pudimos conectarnos con el servidor. Revisá tu conexión.'],
]

export function translateAuthError(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (!(error instanceof Error)) return fallback

  const code = (error as Error & { code?: string }).code
  if (code && MESSAGES_BY_CODE[code]) return MESSAGES_BY_CODE[code]

  const match = MESSAGES_BY_TEXT.find(([pattern]) => pattern.test(error.message))
  return match ? match[1] : error.message || fallback
}

export type PasswordStrength = 0 | 1 | 2 | 3 | 4

/** Puntaje simple (0–4) para el indicador visual de fortaleza de contraseña. */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  else if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 0.5
  return Math.min(4, Math.max(1, Math.floor(score))) as PasswordStrength
}

export const MIN_PASSWORD_LENGTH = 8

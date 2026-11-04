/** Roles de la app (enum public.app_role, migración 016). */
export type AppRole = 'admin' | 'member'

/** Funciones que se habilitan por usuario (enum public.app_permission, migración 016). */
export type AppPermission = 'invoice_ai' | 'mp_sync'

export const PERMISSION_INFO: Record<AppPermission, { label: string; description: string }> = {
  invoice_ai: {
    label: 'Lectura de facturas con IA',
    description: 'Usa Gemini para leer facturas de proveedores desconocidos.',
  },
  mp_sync: {
    label: 'Sincronización con Mercado Pago',
    description: 'Importa gastos desde la cuenta de Mercado Pago del dueño.',
  },
}

export const ALL_PERMISSIONS = Object.keys(PERMISSION_INFO) as AppPermission[]

export interface UserProfile {
  id: string
  email: string
  fullName: string | null
  role: AppRole
  createdAt: string
  permissions: AppPermission[]
}

export interface InviteCode {
  id: string
  code: string
  maxUses: number
  usedCount: number
  expiresAt: string | null
  active: boolean
  note: string | null
  createdAt: string
}

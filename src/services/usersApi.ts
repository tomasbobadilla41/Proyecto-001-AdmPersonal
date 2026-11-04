import { supabase } from '../lib/supabase'
import type { AppPermission, AppRole, InviteCode, UserProfile } from '../types/permissions'

interface ProfileRow {
  id: string
  email: string
  full_name: string | null
  role: AppRole
  created_at: string
}

interface PermissionRow {
  user_id: string
  permission: AppPermission
}

interface InviteCodeRow {
  id: string
  code: string
  max_uses: number
  used_count: number
  expires_at: string | null
  active: boolean
  note: string | null
  created_at: string
}

function toProfile(row: ProfileRow, permissions: PermissionRow[]): UserProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    createdAt: row.created_at,
    permissions: permissions.filter((p) => p.user_id === row.id).map((p) => p.permission),
  }
}

/** Perfil y permisos del usuario logueado. null si todavía no tiene perfil. */
export async function fetchMyProfile(userId: string): Promise<UserProfile | null> {
  const [profileRes, permsRes] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name, role, created_at').eq('id', userId).maybeSingle(),
    supabase.from('user_permissions').select('user_id, permission').eq('user_id', userId),
  ])
  if (profileRes.error) throw profileRes.error
  if (permsRes.error) throw permsRes.error
  return profileRes.data ? toProfile(profileRes.data as ProfileRow, permsRes.data as PermissionRow[]) : null
}

/** Todos los usuarios con sus permisos (RLS: solo un admin ve los ajenos). */
export async function fetchUsers(): Promise<UserProfile[]> {
  const [profilesRes, permsRes] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name, role, created_at').order('created_at'),
    supabase.from('user_permissions').select('user_id, permission'),
  ])
  if (profilesRes.error) throw profilesRes.error
  if (permsRes.error) throw permsRes.error
  const perms = permsRes.data as PermissionRow[]
  return (profilesRes.data as ProfileRow[]).map((row) => toProfile(row, perms))
}

export async function updateUserRole(userId: string, role: AppRole): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  if (error) throw error
}

export async function setUserPermission(userId: string, permission: AppPermission, enabled: boolean): Promise<void> {
  const { error } = enabled
    ? await supabase.from('user_permissions').upsert({ user_id: userId, permission }, { ignoreDuplicates: true })
    : await supabase.from('user_permissions').delete().eq('user_id', userId).eq('permission', permission)
  if (error) throw error
}

export async function fetchInviteCodes(): Promise<InviteCode[]> {
  const { data, error } = await supabase
    .from('invite_codes')
    .select('id, code, max_uses, used_count, expires_at, active, note, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as InviteCodeRow[]).map((row) => ({
    id: row.id,
    code: row.code,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    expiresAt: row.expires_at,
    active: row.active,
    note: row.note,
    createdAt: row.created_at,
  }))
}

// Sin caracteres ambiguos (0/O, 1/I/L) para que sea fácil de dictar o copiar a mano.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** Código aleatorio con formato XXXX-XXXX (crypto, no Math.random). */
export function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`
}

export interface NewInviteCode {
  maxUses: number
  expiresInDays: number | null
  note: string
}

export async function createInviteCode(input: NewInviteCode): Promise<void> {
  const expiresAt =
    input.expiresInDays === null ? null : new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString()
  const { error } = await supabase.from('invite_codes').insert({
    code: generateInviteCode(),
    max_uses: input.maxUses,
    expires_at: expiresAt,
    note: input.note.trim() || null,
  })
  if (error) throw error
}

export async function setInviteCodeActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('invite_codes').update({ active }).eq('id', id)
  if (error) throw error
}

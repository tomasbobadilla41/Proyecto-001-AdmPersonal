import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { fetchMyProfile } from '../services/usersApi'
import type { AppPermission, UserProfile } from '../types/permissions'

/**
 * Perfil (rol + permisos) del usuario logueado. Sirve para mostrar u ocultar
 * secciones en la UI; la autorización real la hacen RLS y las Edge Functions.
 */
export function useCurrentProfile() {
  const { session } = useAuth()
  const userId = session?.user.id
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchMyProfile(userId)
      .then((p) => !cancelled && setProfile(p))
      // Sin migración 016 aplicada la tabla no existe: se trata como "sin perfil".
      .catch(() => !cancelled && setProfile(null))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [userId])

  return {
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    can: (permission: AppPermission) => profile?.permissions.includes(permission) ?? false,
  }
}

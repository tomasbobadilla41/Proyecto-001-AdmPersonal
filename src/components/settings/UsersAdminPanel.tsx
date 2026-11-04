import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Ban, Check, Copy, Loader2, Plus, RefreshCw, ShieldCheck, Ticket, Users } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '../../hooks/useAuth'
import {
  createInviteCode,
  fetchInviteCodes,
  fetchUsers,
  setInviteCodeActive,
  setUserPermission,
  updateUserRole,
} from '../../services/usersApi'
import { ALL_PERMISSIONS, PERMISSION_INFO, type AppPermission, type AppRole, type InviteCode, type UserProfile } from '../../types/permissions'

const dateFormatter = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' })

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

/** Interruptor accesible (no hay Switch de shadcn instalado en el proyecto). */
function Toggle({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
        checked ? 'bg-accent' : 'bg-line-strong',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-panel shadow transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

function inviteStatus(invite: InviteCode): { label: string; className: string } {
  if (!invite.active) return { label: 'Desactivado', className: 'text-faint' }
  if (invite.expiresAt && new Date(invite.expiresAt) <= new Date()) return { label: 'Vencido', className: 'text-warning' }
  if (invite.usedCount >= invite.maxUses) return { label: 'Agotado', className: 'text-muted' }
  return { label: 'Activo', className: 'text-positive' }
}

/** Gestión de usuarios, permisos y códigos de invitación. Solo se muestra a administradores. */
export function UsersAdminPanel() {
  const { session } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [invites, setInvites] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [u, i] = await Promise.all([fetchUsers(), fetchInviteCodes()])
      setUsers(u)
      setInvites(i)
    } catch {
      toast.error('No se pudieron cargar los usuarios.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function run(key: string, action: () => Promise<void>, success: string, fallback: string) {
    setBusyKey(key)
    try {
      await action()
      toast.success(success)
      await load()
    } catch (error) {
      toast.error(errorMessage(error, fallback))
    } finally {
      setBusyKey(null)
    }
  }

  function handleRoleChange(user: UserProfile, role: AppRole) {
    void run(`role-${user.id}`, () => updateUserRole(user.id, role), 'Rol actualizado.', 'No se pudo cambiar el rol.')
  }

  function handlePermissionChange(user: UserProfile, permission: AppPermission, enabled: boolean) {
    void run(
      `perm-${user.id}-${permission}`,
      () => setUserPermission(user.id, permission, enabled),
      enabled ? 'Permiso habilitado.' : 'Permiso quitado.',
      'No se pudo actualizar el permiso.',
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent-text" />
              Usuarios y permisos
            </CardTitle>
            <CardDescription>Definí quién administra la app y qué funciones puede usar cada persona.</CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} aria-label="Actualizar">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </CardHeader>
        <CardContent>
          {loading && users.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Cargando usuarios…</p>
          ) : (
            <ul className="divide-y divide-line">
              {users.map((user) => {
                const isMe = user.id === session?.user.id
                return (
                  <li key={user.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">
                        {user.fullName || user.email}
                        {isMe && <span className="rounded bg-line px-1.5 py-0.5 text-[10px] text-muted uppercase">Vos</span>}
                      </p>
                      {user.fullName && <p className="truncate text-xs text-muted">{user.email}</p>}
                      <p className="text-xs text-faint">Desde {dateFormatter.format(new Date(user.createdAt))}</p>
                    </div>

                    <div className="flex flex-col gap-2.5 sm:w-72">
                      <label className="flex items-center justify-between gap-3 text-sm text-ink-soft">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-faint" />
                          Rol
                        </span>
                        <select
                          value={user.role}
                          disabled={busyKey !== null}
                          onChange={(e) => handleRoleChange(user, e.target.value as AppRole)}
                          className="h-8 rounded-lg border border-line bg-app px-2 text-sm text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <option value="member">Miembro</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </label>
                      {ALL_PERMISSIONS.map((permission) => (
                        <div key={permission} className="flex items-center justify-between gap-3">
                          <span className="text-sm text-ink-soft" title={PERMISSION_INFO[permission].description}>
                            {PERMISSION_INFO[permission].label}
                          </span>
                          <Toggle
                            label={`${PERMISSION_INFO[permission].label} para ${user.email}`}
                            checked={user.permissions.includes(permission)}
                            disabled={busyKey !== null}
                            onChange={(v) => handlePermissionChange(user, permission, v)}
                          />
                        </div>
                      ))}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <InviteCodesCard invites={invites} busyKey={busyKey} run={run} />
    </>
  )
}

interface InviteCodesCardProps {
  invites: InviteCode[]
  busyKey: string | null
  run: (key: string, action: () => Promise<void>, success: string, fallback: string) => Promise<void>
}

function InviteCodesCard({ invites, busyKey, run }: InviteCodesCardProps) {
  const [maxUses, setMaxUses] = useState('1')
  const [expiresInDays, setExpiresInDays] = useState('7')
  const [note, setNote] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function handleCreate(event: FormEvent) {
    event.preventDefault()
    const uses = Number(maxUses)
    if (!Number.isInteger(uses) || uses < 1 || uses > 100) {
      toast.error('La cantidad de usos tiene que ser un número entre 1 y 100.')
      return
    }
    const days = expiresInDays === 'never' ? null : Number(expiresInDays)
    void run(
      'create-invite',
      async () => {
        await createInviteCode({ maxUses: uses, expiresInDays: days, note })
        setNote('')
      },
      'Código de invitación creado.',
      'No se pudo crear el código.',
    )
  }

  async function handleCopy(invite: InviteCode) {
    try {
      await navigator.clipboard.writeText(invite.code)
      setCopiedId(invite.id)
      setTimeout(() => setCopiedId((id) => (id === invite.id ? null : id)), 1500)
    } catch {
      toast.error('No se pudo copiar el código.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-accent-text" />
          Códigos de invitación
        </CardTitle>
        <CardDescription>
          Para crear una cuenta hace falta un código válido. Generá uno y compartilo con la persona que quieras sumar.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-[1fr_6rem_8rem_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-note">Para quién (opcional)</Label>
            <Input id="invite-note" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Mamá" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-uses">Usos</Label>
            <Input id="invite-uses" type="number" min={1} max={100} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-expiry">Vence en</Label>
            <select
              id="invite-expiry"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="1">1 día</option>
              <option value="7">7 días</option>
              <option value="30">30 días</option>
              <option value="never">Nunca</option>
            </select>
          </div>
          <Button type="submit" disabled={busyKey !== null}>
            {busyKey === 'create-invite' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Generar
          </Button>
        </form>

        {invites.length === 0 ? (
          <p className="text-sm text-muted">Todavía no generaste ningún código.</p>
        ) : (
          <ul className="divide-y divide-line">
            {invites.map((invite) => {
              const status = inviteStatus(invite)
              return (
                <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm font-semibold tracking-wider text-ink">{invite.code}</code>
                      <span className={cn('text-xs', status.className)}>{status.label}</span>
                    </div>
                    <p className="text-xs text-muted">
                      {invite.note ? `${invite.note} · ` : ''}
                      {invite.usedCount}/{invite.maxUses} usos
                      {invite.expiresAt ? ` · vence ${dateFormatter.format(new Date(invite.expiresAt))}` : ' · sin vencimiento'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => void handleCopy(invite)}>
                      {copiedId === invite.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedId === invite.id ? 'Copiado' : 'Copiar'}
                    </Button>
                    {invite.active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyKey !== null}
                        onClick={() =>
                          void run(
                            `invite-${invite.id}`,
                            () => setInviteCodeActive(invite.id, false),
                            'Código desactivado.',
                            'No se pudo desactivar el código.',
                          )
                        }
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Desactivar
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

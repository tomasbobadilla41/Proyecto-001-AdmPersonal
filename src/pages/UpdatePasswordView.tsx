import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { AuthShell } from '../components/auth/AuthShell'
import { PasswordInput } from '../components/auth/PasswordInput'
import { supabase } from '../lib/supabase'
import { MIN_PASSWORD_LENGTH, translateAuthError } from '../utils/authErrors'

interface UpdatePasswordViewProps {
  onSuccess: () => void
}

/** Pantalla que llega desde el enlace de "recuperar contraseña" enviado por Supabase. */
export function UpdatePasswordView({ onSuccess }: UpdatePasswordViewProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const mismatch = confirmPassword.length > 0 && confirmPassword !== password

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Tu contraseña se actualizó correctamente.')
      onSuccess()
    } catch (error) {
      toast.error(translateAuthError(error, 'No se pudo actualizar la contraseña.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Actualizar contraseña" description="Elegí una nueva contraseña para tu cuenta.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-password" className="text-ink-soft">
            Nueva contraseña
          </Label>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            showStrength
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-password" className="text-ink-soft">
            Confirmar contraseña
          </Label>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={mismatch}
            placeholder="Repetí la contraseña"
          />
          {mismatch && <p className="text-xs text-negative">Las contraseñas no coinciden.</p>}
        </div>

        <Button type="submit" size="lg" className="mt-1 h-11 w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Actualizar contraseña
        </Button>
      </form>
    </AuthShell>
  )
}

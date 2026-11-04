import { useState, type ComponentProps, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, Loader2, Mail, MailCheck, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { AuthShell } from '../components/auth/AuthShell'
import { PasswordInput, authInputClassName } from '../components/auth/PasswordInput'
import { supabase } from '../lib/supabase'
import { MIN_PASSWORD_LENGTH, translateAuthError } from '../utils/authErrors'

type AuthMode = 'login' | 'signup' | 'reset' | 'check-email'

const COPY: Record<AuthMode, { title: string; description: string }> = {
  login: { title: 'Bienvenido de nuevo', description: 'Ingresá a tu cuenta para ver tus finanzas.' },
  signup: { title: 'Creá tu cuenta', description: 'Empezá a ordenar tus gastos e ingresos en minutos.' },
  reset: {
    title: 'Recuperar contraseña',
    description: 'Ingresá tu correo y te enviamos un enlace para restablecerla.',
  },
  'check-email': { title: 'Revisá tu correo', description: '' },
}

/**
 * Muro de acceso contra Supabase Auth: inicio de sesión, registro de cuenta
 * nueva y recuperación de contraseña. Cada usuario ve solo sus datos gracias
 * a las políticas RLS de las tablas.
 */
export function AuthView() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(next: AuthMode) {
    setMode(next)
    setPassword('')
    setConfirmPassword('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (mode === 'signup') {
      if (password.length < MIN_PASSWORD_LENGTH) {
        toast.error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
        return
      }
      if (password !== confirmPassword) {
        toast.error('Las contraseñas no coinciden.')
        return
      }
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: window.location.origin,
          },
        })
        if (error) throw error
        // Con la confirmación por email activa, Supabase no devuelve error si el
        // correo ya existe (para no filtrar qué cuentas hay): lo detectamos por
        // `identities` vacío.
        if (data.user && data.user.identities?.length === 0) {
          toast.error('Ya existe una cuenta con ese correo. Iniciá sesión o recuperá tu contraseña.')
          switchMode('login')
          return
        }
        if (data.session) {
          toast.success('¡Cuenta creada! Bienvenido a Adm Personal.')
        } else {
          setMode('check-email')
        }
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/update-password`,
        })
        if (error) throw error
        toast.success('Te enviamos un enlace para recuperar tu contraseña. Revisá tu bandeja de entrada.')
        switchMode('login')
      }
    } catch (error) {
      toast.error(translateAuthError(error))
    } finally {
      setLoading(false)
    }
  }

  async function handleResendConfirmation() {
    setLoading(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) throw error
      toast.success('Te reenviamos el correo de confirmación.')
    } catch (error) {
      toast.error(translateAuthError(error))
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'check-email') {
    return (
      <AuthShell title={COPY['check-email'].title}>
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-4 rounded-xl border border-line bg-panel p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-positive/15 text-positive">
              <MailCheck className="h-5 w-5" />
            </span>
            <p className="text-sm text-ink-soft">
              Te enviamos un enlace de confirmación a <span className="font-medium text-ink">{email}</span>. Abrilo
              para activar tu cuenta y después iniciá sesión.
            </p>
          </div>
          <Button type="button" size="lg" className="h-11 w-full" onClick={() => switchMode('login')}>
            Ir a iniciar sesión
          </Button>
          <p className="text-center text-sm text-muted">
            ¿No te llegó?{' '}
            <button
              type="button"
              disabled={loading}
              onClick={handleResendConfirmation}
              className="font-medium text-accent-text hover:underline disabled:opacity-50"
            >
              Reenviar correo
            </button>
          </p>
        </div>
      </AuthShell>
    )
  }

  const submitLabel = { login: 'Iniciar sesión', signup: 'Crear cuenta', reset: 'Enviar enlace' }[mode]

  return (
    <AuthShell title={COPY[mode].title} description={COPY[mode].description}>
      {mode !== 'reset' && (
        <div role="tablist" aria-label="Tipo de acceso" className="mb-6 grid grid-cols-2 rounded-lg bg-line p-1">
          {(['login', 'signup'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={mode === tab}
              onClick={() => switchMode(tab)}
              className={
                mode === tab
                  ? 'rounded-md bg-panel py-1.5 text-sm font-medium text-ink shadow-sm'
                  : 'rounded-md py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink'
              }
            >
              {tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {mode === 'signup' && (
          <Field id="full-name" label="Nombre">
            <IconInput
              icon={<User className="h-4 w-4" />}
              id="full-name"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="¿Cómo te llamás?"
            />
          </Field>
        )}

        <Field id="email" label="Correo electrónico">
          <IconInput
            icon={<Mail className="h-4 w-4" />}
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
          />
        </Field>

        {mode !== 'reset' && (
          <Field
            id="password"
            label="Contraseña"
            action={
              mode === 'login' && (
                <button
                  type="button"
                  className="text-xs font-medium text-accent-text hover:underline"
                  onClick={() => switchMode('reset')}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )
            }
          >
            <PasswordInput
              id="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={mode === 'signup' ? MIN_PASSWORD_LENGTH : undefined}
              showStrength={mode === 'signup'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? `Mínimo ${MIN_PASSWORD_LENGTH} caracteres` : '••••••••'}
            />
          </Field>
        )}

        {mode === 'signup' && (
          <Field id="confirm-password" label="Confirmar contraseña">
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={confirmPassword.length > 0 && confirmPassword !== password}
              placeholder="Repetí la contraseña"
            />
            {confirmPassword.length > 0 && confirmPassword !== password && (
              <p className="text-xs text-negative">Las contraseñas no coinciden.</p>
            )}
          </Field>
        )}

        <Button type="submit" size="lg" className="mt-1 h-11 w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>

        {mode === 'reset' && (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={loading}
            onClick={() => switchMode('login')}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a iniciar sesión
          </Button>
        )}
      </form>

      {mode !== 'reset' && (
        <p className="mt-6 text-center text-sm text-muted">
          {mode === 'login' ? '¿No tenés cuenta? ' : '¿Ya tenés cuenta? '}
          <button
            type="button"
            className="font-medium text-accent-text hover:underline"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Creá una gratis' : 'Iniciá sesión'}
          </button>
        </p>
      )}
    </AuthShell>
  )
}

function Field({ id, label, action, children }: { id: string; label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-ink-soft">
          {label}
        </Label>
        {action}
      </div>
      {children}
    </div>
  )
}

function IconInput({ icon, className, ...props }: ComponentProps<'input'> & { icon: ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint">{icon}</span>
      <input className={className ? `${authInputClassName} ${className}` : authInputClassName} {...props} />
    </div>
  )
}

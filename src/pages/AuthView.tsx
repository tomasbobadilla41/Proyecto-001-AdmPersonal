import { useState, type FormEvent } from 'react'
import { Loader2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { supabase } from '../lib/supabase'

type AuthMode = 'login' | 'reset'

/**
 * Muro de acceso: login/recuperación de contraseña contra Supabase Auth.
 * Sin registro: la app es de uso personal, las cuentas se crean a mano desde
 * el panel de Supabase (Authentication → Users), no desde esta pantalla.
 */
export function AuthView() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/update-password`,
        })
        if (error) throw error
        toast.success('Te enviamos un enlace para recuperar tu contraseña. Revisá tu bandeja de entrada.')
        setMode('login')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ocurrió un error inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app p-4 text-ink">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-lg font-semibold">
            <Wallet className="h-6 w-6 text-accent" />
            Adm Personal
          </div>
          <CardTitle>{mode === 'login' ? 'Iniciar sesión' : 'Recuperar contraseña'}</CardTitle>
          <CardDescription>
            {mode === 'login' && 'Ingresá tus credenciales para acceder a tus finanzas.'}
            {mode === 'reset' && 'Ingresá tu correo y te enviamos un enlace para restablecerla.'}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </div>
            {mode === 'login' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <button
                    type="button"
                    className="text-xs text-muted hover:text-accent"
                    onClick={() => setMode('reset')}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Iniciar Sesión' : 'Enviar enlace'}
            </Button>
            {mode === 'reset' && (
              <Button type="button" variant="ghost" className="w-full" disabled={loading} onClick={() => setMode('login')}>
                Volver a iniciar sesión
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

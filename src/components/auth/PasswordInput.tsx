import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPasswordStrength } from '../../utils/authErrors'

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'> & {
  /** Muestra la barra de fortaleza debajo del campo (útil al crear/cambiar contraseña). */
  showStrength?: boolean
}

const STRENGTH_LABELS = ['', 'Débil', 'Aceptable', 'Buena', 'Fuerte'] as const
const STRENGTH_COLORS = ['', 'bg-negative', 'bg-warning', 'bg-accent', 'bg-positive'] as const

/** Campo de contraseña con ícono, botón para mostrar/ocultar e indicador de fortaleza opcional. */
export function PasswordInput({ className, showStrength = false, value, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const strength = showStrength ? getPasswordStrength(String(value ?? '')) : 0

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          className={cn(authInputClassName, 'pr-10', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-faint transition-colors outline-none hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {showStrength && strength > 0 && (
        <div className="flex items-center gap-2" aria-live="polite">
          <div className="flex flex-1 gap-1">
            {[1, 2, 3, 4].map((step) => (
              <span
                key={step}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  step <= strength ? STRENGTH_COLORS[strength] : 'bg-line',
                )}
              />
            ))}
          </div>
          <span className="w-16 text-right text-xs text-muted">{STRENGTH_LABELS[strength]}</span>
        </div>
      )}
    </div>
  )
}

/** Estilo compartido de los inputs de las pantallas de autenticación (más altos que los del resto de la app). */
export const authInputClassName =
  'h-11 w-full min-w-0 rounded-lg border border-line bg-app pl-10 pr-3 text-base text-ink transition-colors outline-none placeholder:text-faint focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/25 disabled:opacity-50 aria-invalid:border-negative md:text-sm'

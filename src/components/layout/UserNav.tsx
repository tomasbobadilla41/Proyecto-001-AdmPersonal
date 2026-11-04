import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '../ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { useAuth } from '../../hooks/useAuth'
import { ThemeSelector } from './ThemeSelector'

interface UserNavProps {
  /** 'sidebar': avatar + email al pie del menú lateral (desktop). 'compact': solo el avatar (header mobile). */
  variant?: 'sidebar' | 'compact'
}

/** Menú de usuario (avatar + email + tema + cerrar sesión). */
export function UserNav({ variant = 'compact' }: UserNavProps) {
  const { session, signOut } = useAuth()
  const email = session?.user.email ?? ''
  const initial = email.charAt(0).toUpperCase() || '?'

  async function handleSignOut() {
    try {
      await signOut()
      toast.success('Sesión cerrada correctamente.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cerrar la sesión.')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          variant === 'sidebar'
            ? 'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-line focus-visible:ring-3 focus-visible:ring-ring/50'
            : 'rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
        }
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-accent/15 text-sm text-accent-text">{initial}</AvatarFallback>
        </Avatar>
        {variant === 'sidebar' && <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{email}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={variant === 'sidebar' ? 'top' : 'bottom'}
        align={variant === 'sidebar' ? 'start' : 'end'}
        className="w-64"
      >
        <DropdownMenuLabel className="truncate font-normal text-ink" title={email}>
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <div className="px-1.5 pb-1">
          <ThemeSelector />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

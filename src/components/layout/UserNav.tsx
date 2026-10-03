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

/** Menú de usuario (avatar + email + cerrar sesión) en la esquina superior derecha, estilo Google/YouTube. */
export function UserNav() {
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
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Avatar>
          <AvatarFallback className="bg-accent/15 text-accent">{initial}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="truncate font-normal text-ink" title={email}>
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

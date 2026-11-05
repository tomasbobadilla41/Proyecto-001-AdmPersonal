import { ApplePayRequestLog } from '../components/settings/ApplePayRequestLog'
import { DataMigrationCenter } from '../components/settings/DataMigrationCenter'
import { UsersAdminPanel } from '../components/settings/UsersAdminPanel'
import { useCurrentProfile } from '../hooks/useCurrentProfile'

export function SettingsPage() {
  const { isAdmin } = useCurrentProfile()

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Configuración</h2>
        <p className="text-sm text-muted">Importá o exportá tus datos financieros y revisá las integraciones.</p>
      </div>

      <DataMigrationCenter />

      <ApplePayRequestLog />

      {/* Solo admins: la autorización real la hace RLS, esto solo oculta la sección. */}
      {isAdmin && <UsersAdminPanel />}
    </div>
  )
}

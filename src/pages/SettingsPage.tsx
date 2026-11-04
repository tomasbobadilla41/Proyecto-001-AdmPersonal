import { ApplePayRequestLog } from '../components/settings/ApplePayRequestLog'
import { DataMigrationCenter } from '../components/settings/DataMigrationCenter'

export function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Configuración</h2>
        <p className="text-sm text-muted">Importá o exportá tus datos financieros y revisá las integraciones.</p>
      </div>

      <DataMigrationCenter />

      <ApplePayRequestLog />
    </div>
  )
}

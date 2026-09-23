import { DataMigrationCenter } from '../components/settings/DataMigrationCenter'

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-ink">Configuración</h2>
        <p className="text-sm text-muted">Importá o exportá tus datos financieros.</p>
      </div>

      <DataMigrationCenter />
    </div>
  )
}

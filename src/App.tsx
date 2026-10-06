import { useState } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { InvestmentsPage } from './pages/InvestmentsPage'
import { PaymentsHubPage } from './pages/PaymentsHubPage'
import { RealEstateDashboardView } from './pages/RealEstateDashboardView'
import { SettingsPage } from './pages/SettingsPage'
import { AuthView } from './pages/AuthView'
import { UpdatePasswordView } from './pages/UpdatePasswordView'
import { FinanceStoreProvider } from './hooks/useFinanceStore'
import { ExpenseStoreProvider } from './hooks/useExpenseStore'
import { ServicesStoreProvider } from './hooks/useServicesStore'
import { RealEstateStoreProvider } from './hooks/useRealEstateStore'
import { PortfolioStoreProvider } from './hooks/usePortfolioStore'
import { ThemeProvider } from './hooks/useTheme'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { Toaster } from './components/ui/sonner'
import type { TabKey } from './types/navigation'

function AuthGate() {
  const { session, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-app text-muted">Cargando…</div>
  }

  if (!session) {
    return <AuthView />
  }

  return (
    <FinanceStoreProvider>
      <ExpenseStoreProvider>
        <ServicesStoreProvider>
          <RealEstateStoreProvider>
            <PortfolioStoreProvider>
              <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
                {activeTab === 'dashboard' && <DashboardPage />}
                {activeTab === 'gastos' && <ExpensesPage />}
                {activeTab === 'inversiones' && <InvestmentsPage />}
                {activeTab === 'pagos' && <PaymentsHubPage />}
                {activeTab === 'inmuebles' && <RealEstateDashboardView />}
                {activeTab === 'config' && <SettingsPage />}
              </AppLayout>
            </PortfolioStoreProvider>
          </RealEstateStoreProvider>
        </ServicesStoreProvider>
      </ExpenseStoreProvider>
    </FinanceStoreProvider>
  )
}

function App() {
  const [path, setPath] = useState(() => window.location.pathname)

  return (
    <ThemeProvider>
      <AuthProvider>
        {path === '/update-password' ? (
          <UpdatePasswordView
            onSuccess={() => {
              window.history.replaceState(null, '', '/')
              setPath('/')
            }}
          />
        ) : (
          <AuthGate />
        )}
      </AuthProvider>
      {/* top-right: varias pantallas (Gastos, Inversiones...) tienen un FloatingActionButton fijo abajo a la derecha */}
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  )
}

export default App

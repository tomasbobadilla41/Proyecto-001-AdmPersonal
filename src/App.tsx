import { useState } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { InvestmentsPage } from './pages/InvestmentsPage'
import { PaymentsHubPage } from './pages/PaymentsHubPage'
import { RealEstateDashboardView } from './pages/RealEstateDashboardView'
import { FinanceStoreProvider } from './hooks/useFinanceStore'
import { ServicesStoreProvider } from './hooks/useServicesStore'
import { RealEstateStoreProvider } from './hooks/useRealEstateStore'
import { ThemeProvider } from './hooks/useTheme'
import type { TabKey } from './types/navigation'

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')

  return (
    <ThemeProvider>
      <FinanceStoreProvider>
        <ServicesStoreProvider>
          <RealEstateStoreProvider>
            <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
              {activeTab === 'dashboard' && <DashboardPage />}
              {activeTab === 'gastos' && <ExpensesPage />}
              {activeTab === 'inversiones' && <InvestmentsPage />}
              {activeTab === 'pagos' && <PaymentsHubPage />}
              {activeTab === 'inmuebles' && <RealEstateDashboardView />}
            </AppLayout>
          </RealEstateStoreProvider>
        </ServicesStoreProvider>
      </FinanceStoreProvider>
    </ThemeProvider>
  )
}

export default App

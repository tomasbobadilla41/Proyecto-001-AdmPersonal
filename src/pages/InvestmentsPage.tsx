import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { CryptoTab } from '../components/investments/CryptoTab'
import { CedearTab } from '../components/investments/CedearTab'

export function InvestmentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-ink">Inversiones</h2>
        <p className="text-sm text-muted">Portfolio Tracker — registrá tus compras de cripto y CEDEARs.</p>
      </div>

      <Tabs defaultValue="crypto">
        <TabsList>
          <TabsTrigger value="crypto">Criptomonedas</TabsTrigger>
          <TabsTrigger value="cedear">Bolsa (CEDEARs)</TabsTrigger>
        </TabsList>
        <TabsContent value="crypto">
          <CryptoTab />
        </TabsContent>
        <TabsContent value="cedear">
          <CedearTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

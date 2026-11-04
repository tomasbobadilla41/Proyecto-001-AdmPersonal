import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { CryptoTab } from '../components/investments/CryptoTab'
import { CedearTab } from '../components/investments/CedearTab'

/**
 * Portfolio en dos pestañas separadas a propósito: cripto opera en USD y los
 * CEDEARs en ARS, así que no se suman en un único total. Cada pestaña tiene
 * su propio resumen, posiciones y botón "Registrar compra" (Radix desmonta la
 * pestaña inactiva, así que nunca hay dos botones flotantes a la vez).
 */
export function InvestmentsPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <h2 className="text-2xl font-semibold tracking-tight text-ink">Inversiones</h2>

      <Tabs defaultValue="crypto" className="gap-4">
        <TabsList>
          <TabsTrigger value="crypto">Cripto · USD</TabsTrigger>
          <TabsTrigger value="cedear">CEDEARs · ARS</TabsTrigger>
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

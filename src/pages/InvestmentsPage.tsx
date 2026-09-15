import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { InvestmentPosition } from '../types/finance'
import { InvestmentFormDrawer } from '../components/investments/InvestmentFormDrawer'
import { PortfolioSummaryCard } from '../components/investments/PortfolioSummaryCard'
import { FloatingActionButton } from '../components/common/FloatingActionButton'
import { useFinanceStore } from '../hooks/useFinanceStore'
import { formatMoney } from '../utils/currency'
import { formatPercentage, getExchangeRate } from '../utils/finance'
import { getPositionResult } from '../utils/investments'

type InvestmentFormState = { mode: 'create' } | { mode: 'edit'; position: InvestmentPosition } | null

export function InvestmentsPage() {
  const { investments, exchangeRates, addInvestment, updateInvestment, removeInvestment } = useFinanceStore()
  const [formState, setFormState] = useState<InvestmentFormState>(null)

  // Las posiciones no están atadas a un mes puntual: se estandarizan con la
  // cotización del mes calendario actual (la misma que se carga en el Dashboard).
  const now = new Date()
  const tipoCambio = getExchangeRate(exchangeRates, now.getMonth() + 1, now.getFullYear())

  function handleDelete(position: InvestmentPosition) {
    if (window.confirm(`¿Eliminar la posición "${position.ticker}"?`)) {
      removeInvestment(position.id)
    }
  }

  function handleSubmit(position: InvestmentPosition) {
    if (formState?.mode === 'edit') {
      updateInvestment(position)
    } else {
      addInvestment(position)
    }
    setFormState(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-ink">Inversiones</h2>
        <p className="text-sm text-muted">Portfolio de posiciones abiertas</p>
      </div>

      <PortfolioSummaryCard positions={investments} tipoCambio={tipoCambio} />

      <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel/70 text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Ticker</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 text-right font-medium">Cantidad</th>
              <th className="px-4 py-3 font-medium">Moneda</th>
              <th className="px-4 py-3 text-right font-medium">PPP</th>
              <th className="px-4 py-3 text-right font-medium">Precio Actual</th>
              <th className="px-4 py-3 text-right font-medium">Rendimiento</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {investments.map((position) => {
              const { monto, porcentaje } = getPositionResult(position)
              const isPositive = monto >= 0
              const colorClass = isPositive ? 'text-emerald-400' : 'text-rose-400'

              return (
                <tr key={position.id} className="text-ink-soft">
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{position.ticker}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="rounded-full bg-line px-2 py-0.5 text-xs text-ink-soft">
                      {position.tipo}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{position.cantidad}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{position.moneda}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatMoney({ amount: position.precioCompraPromedio, currency: position.moneda })}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatMoney({ amount: position.precioActual, currency: position.moneda })}
                  </td>
                  <td className={`whitespace-nowrap px-4 py-3 text-right font-medium ${colorClass}`}>
                    <div>{formatPercentage(porcentaje)}</div>
                    <div className="text-xs opacity-80">
                      {formatMoney({ amount: monto, currency: position.moneda })}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setFormState({ mode: 'edit', position })}
                        aria-label="Editar posición"
                        className="rounded-lg p-1.5 text-faint transition-colors hover:bg-line hover:text-ink-soft"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(position)}
                        aria-label="Eliminar posición"
                        className="rounded-lg p-1.5 text-faint transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {investments.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-faint">
                  Todavía no cargaste ninguna posición.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <FloatingActionButton
        icon={Plus}
        label="Registrar compra"
        onClick={() => setFormState({ mode: 'create' })}
      />
      <InvestmentFormDrawer
        isOpen={formState !== null}
        onClose={() => setFormState(null)}
        onSubmit={handleSubmit}
        initialPosition={formState?.mode === 'edit' ? formState.position : undefined}
      />
    </div>
  )
}

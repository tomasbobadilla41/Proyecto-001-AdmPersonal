import { formatMoney } from '../../utils/currency'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'
import type { BudgetRule503020 } from '../../utils/budgetRule'

interface BudgetRuleCardProps {
  /** Ingreso total del mes, en ARS. */
  ingresoARS: number
  /** Suma real de gastos FIJO del mes, en ARS. */
  fijosReal: number
  /** Suma real de gastos FLEXIBLE del mes, en ARS. */
  flexiblesReal: number
  /** Montos ideales según la regla 50/30/20, en ARS. */
  budget: BudgetRule503020
}

/**
 * Regla 50/30/20 en una sola tarjeta: una barra apilada con cómo se repartió
 * el ingreso del mes y, debajo, cada bloque contra su monto ideal. Reemplaza
 * a las tres tarjetas separadas (Fijos / Flexibles / Ahorro) — comparar los
 * tres bloques es justamente el punto, y es más fácil verlos juntos.
 */
export function BudgetRuleCard({ ingresoARS, fijosReal, flexiblesReal, budget }: BudgetRuleCardProps) {
  const disponible = ingresoARS - fijosReal - flexiblesReal

  // Base de la barra: el ingreso, o el total gastado si se gastó más de lo
  // que entró (así la barra siempre suma 100% y el exceso se ve proporcional).
  const base = Math.max(ingresoARS, fijosReal + flexiblesReal)
  const pct = (valor: number) => (base > 0 ? (Math.max(valor, 0) / base) * 100 : 0)

  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-line bg-panel p-5 sm:gap-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm text-muted">Distribución del ingreso</h3>
        <span className="text-xs text-faint">Regla 50 / 30 / 20</span>
      </div>

      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-line"
        role="img"
        aria-label="Reparto del ingreso entre gastos fijos, flexibles y disponible"
      >
        <div className="h-full bg-fijos transition-all" style={{ width: `${pct(fijosReal)}%` }} />
        <div className="h-full bg-flexibles transition-all" style={{ width: `${pct(flexiblesReal)}%` }} />
        <div className="h-full bg-ahorro transition-all" style={{ width: `${pct(disponible)}%` }} />
      </div>

      {/* Mobile: una fila compacta por bloque. Desde sm: tres columnas. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <BudgetBlock label="Fijos" dotClassName="bg-fijos" real={fijosReal} ideal={budget.fijos} percent={50} kind="limite" />
        <BudgetBlock
          label="Flexibles"
          dotClassName="bg-flexibles"
          real={flexiblesReal}
          ideal={budget.flexibles}
          percent={30}
          kind="limite"
        />
        <BudgetBlock
          label="Disponible"
          dotClassName="bg-ahorro"
          real={disponible}
          ideal={budget.ahorro}
          percent={20}
          kind="meta"
        />
      </div>
    </div>
  )
}

interface BudgetBlockProps {
  label: string
  dotClassName: string
  real: number
  ideal: number
  percent: number
  /** 'limite': pasarse es malo (Fijos, Flexibles). 'meta': llegar es bueno (Ahorro). */
  kind: 'limite' | 'meta'
}

function BudgetBlock({ label, dotClassName, real, ideal, percent, kind }: BudgetBlockProps) {
  const animated = useAnimatedNumber(real)
  const idealLabel = formatMoney({ amount: ideal, currency: 'ARS' })

  let amountClassName = 'text-ink'
  let caption = kind === 'limite' ? `de ${idealLabel} (${percent}%)` : `meta ${idealLabel} (${percent}%)`
  let captionClassName = 'text-faint'

  if (kind === 'limite' && ideal > 0 && real > ideal) {
    caption = `Excedido por ${formatMoney({ amount: real - ideal, currency: 'ARS' })}`
    captionClassName = 'text-negative'
  } else if (kind === 'meta' && real < 0) {
    amountClassName = 'text-negative'
    caption = 'Gastaste más de lo que ingresó'
    captionClassName = 'text-negative'
  } else if (kind === 'meta' && ideal > 0 && real >= ideal) {
    amountClassName = 'text-positive'
    caption = `Meta cumplida (${percent}%)`
    captionClassName = 'text-positive'
  }

  return (
    // Grilla de 2 columnas en mobile (etiqueta + leyenda | monto a la derecha);
    // desde sm se apila en una sola columna: etiqueta, monto, leyenda.
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 sm:grid-cols-1 sm:items-start sm:gap-y-1">
      <span className="col-start-1 row-start-1 flex items-center gap-2 text-xs text-muted">
        <span className={`h-2 w-2 rounded-full ${dotClassName}`} />
        {label}
      </span>
      <span
        className={`col-start-2 row-span-2 row-start-1 text-base font-semibold tabular-nums sm:col-start-1 sm:row-span-1 sm:row-start-2 sm:text-xl ${amountClassName}`}
      >
        {formatMoney({ amount: animated, currency: 'ARS' })}
      </span>
      <span className={`col-start-1 row-start-2 text-xs sm:row-start-3 ${captionClassName}`}>{caption}</span>
    </div>
  )
}

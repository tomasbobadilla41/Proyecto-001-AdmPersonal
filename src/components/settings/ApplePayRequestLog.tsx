import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, RefreshCw, ShieldAlert, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchApplePayRequests } from '../../services/applePayRequestsApi'
import type { ApplePayRequest } from '../../types/applePay'
import { formatMoney } from '../../utils/currency'

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Buenos_Aires',
})

function StatusIcon({ status }: { status: number }) {
  if (status === 200) return <CheckCircle2 className="h-4 w-4 shrink-0 text-positive" aria-label="OK" />
  if (status === 401) return <ShieldAlert className="h-4 w-4 shrink-0 text-warning" aria-label="No autorizado" />
  return <XCircle className="h-4 w-4 shrink-0 text-negative" aria-label="Error" />
}

function RequestRow({ request }: { request: ApplePayRequest }) {
  const ok = request.status === 200
  return (
    <li className="flex flex-col gap-1 py-3">
      <div className="flex items-start gap-3">
        <StatusIcon status={request.status} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="text-sm font-medium text-ink">
              {request.parsedAmount ? formatMoney(request.parsedAmount) : 'Sin monto válido'}
            </span>
            <span className="text-xs text-muted">
              {dateFormatter.format(new Date(request.receivedAt))} · HTTP {request.status}
            </span>
          </div>
          {ok ? (
            <span className="text-xs text-muted">Gasto registrado.</span>
          ) : (
            <span className="break-words text-xs text-negative">{request.error}</span>
          )}
          {request.payload !== null && (
            <details className="text-xs text-muted">
              <summary className="cursor-pointer select-none">Ver lo recibido</summary>
              <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-muted/10 p-2 font-mono whitespace-pre-wrap break-all">
                {JSON.stringify(request.payload, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </li>
  )
}

/** Últimas llamadas del Shortcut de iOS al endpoint de Apple Pay, con su resultado. */
export function ApplePayRequestLog() {
  const [requests, setRequests] = useState<ApplePayRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      setRequests(await fetchApplePayRequests())
    } catch {
      toast.error('No se pudo cargar el historial de Apple Pay.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const failed = requests.filter((r) => r.status !== 200).length

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Apple Pay</CardTitle>
          <CardDescription>
            Últimas {requests.length || ''} llamadas del Shortcut
            {failed > 0 ? ` · ${failed} con error` : ''}.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => void load()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </CardHeader>
      <CardContent>
        {!isLoading && requests.length === 0 ? (
          <p className="text-sm text-muted">Todavía no llegó ninguna llamada.</p>
        ) : (
          <ul className="divide-y divide-border">
            {requests.map((request) => (
              <RequestRow key={request.id} request={request} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

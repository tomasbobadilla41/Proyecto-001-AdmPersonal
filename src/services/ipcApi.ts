const IPC_SERIES_ID = '148.3_INIVELNAL_DICI_M_26'
const IPC_API_URL = `https://apis.datos.gob.ar/series/api/series/?ids=${IPC_SERIES_ID}&limit=1&sort=desc`

export interface IpcDataPoint {
  /** Primer día del mes al que corresponde el dato, 'YYYY-MM-DD'. */
  date: string
  value: number
}

interface DatosGobSeriesResponse {
  data: Array<[string, number]>
}

/**
 * Último valor publicado del IPC Nacional (INDEC, base dic-2016), vía la API
 * de Series de Tiempo de datos.gob.ar (https://apis.datos.gob.ar/series/api).
 * Es una API pública real del Estado argentino, con CORS abierto — se puede
 * llamar directo desde el navegador, sin proxy.
 */
export async function fetchLatestIpc(): Promise<IpcDataPoint> {
  const response = await fetch(IPC_API_URL)
  if (!response.ok) {
    throw new Error(`datos.gob.ar respondió ${response.status}`)
  }
  const json = (await response.json()) as DatosGobSeriesResponse
  const point = json.data[0]
  if (!point) {
    throw new Error('datos.gob.ar no devolvió datos')
  }
  const [date, value] = point
  return { date, value }
}

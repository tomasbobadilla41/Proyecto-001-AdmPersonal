import type { Currency } from './money'

/** Una propiedad en alquiler. */
export interface Property {
  id: string
  /** Nombre corto para identificarla (ej: "Balcarce 319", "Castillo"). */
  name: string
  address: string
}

/** Configuración de un servicio asociado a una propiedad (para saber a quién y cómo pagarle). */
export interface PropertyServiceConfig {
  id: string
  propertyId: string
  /** Ej: Edenor, Naturgy, ARBA, Municipio. */
  serviceName: string
  accountNumber: string
  /** Si está en débito automático (no requiere pago manual mes a mes). */
  isAutoDebit: boolean
}

export type PropertyExpenseStatus = 'PAID' | 'PENDING' | 'AUTO_DEBIT'

/** Registro mensual de un gasto/servicio de una propiedad. */
export interface PropertyExpense {
  id: string
  propertyId: string
  /**
   * FK a `PropertyServiceConfig.id` — es la relación "viva": si el servicio
   * se renombra, este gasto sigue encontrándolo. Usar esto para relacionar,
   * no `serviceName`. `null` si el servicio original se borró (en la base,
   * la FK es `ON DELETE SET NULL`) — el gasto sobrevive con su snapshot de
   * `serviceName`.
   */
  serviceConfigId: string | null
  /**
   * Snapshot del nombre del servicio al momento de guardar este gasto (no
   * necesariamente el nombre actual). Se conserva aunque el
   * `PropertyServiceConfig` se borre o se renombre después, para no perder
   * el contexto histórico de un registro viejo.
   */
  serviceName: string
  /** Mes calendario, 1 (enero) a 12 (diciembre). */
  month: number
  year: number
  amount: number
  status: PropertyExpenseStatus
}

/** Registro mensual del alquiler cobrado por una propiedad. */
export interface PropertyIncome {
  id: string
  propertyId: string
  month: number
  year: number
  amount: number
  currency: Currency
}

/** Índice usado para actualizar el alquiler (IPC/ICL), o 'FIJO' si no se actualiza por índice. */
export type RentIndexType = 'IPC' | 'ICL' | 'FIJO'

/** Contrato de alquiler de una propiedad. */
export interface LeaseContract {
  id: string
  propertyId: string
  /** Nombre del inquilino. */
  tenantName: string
  /** Fecha de inicio, formato ISO 'YYYY-MM-DD' (mismo formato que un `<input type="date">`). */
  startDate: string
  /** Fecha de fin, formato ISO 'YYYY-MM-DD'. */
  endDate: string
  /** Precio base pactado al firmar el contrato. */
  initialRentAmount: number
  /** Precio actualmente cobrado (después de las actualizaciones que hubo desde la firma). */
  currentRentAmount: number
  /** Cada cuántos meses se actualiza el alquiler (ej: 3, 4, 6). */
  updateFrequencyMonths: number
  indexType: RentIndexType
  /** Valor del índice (IPC/ICL) el día que se firmó el contrato, si `indexType` no es 'FIJO'. */
  baseIndexValue?: number
}

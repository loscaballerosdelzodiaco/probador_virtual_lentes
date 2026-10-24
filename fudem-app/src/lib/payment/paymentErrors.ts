/** Código de Postgres para una restricción única violada. */
export const UNIQUE_VIOLATION_CODE = '23505'

/** El pedido ya tiene un pago aprobado (índice único de la tabla pago, CA7). */
export class PaymentAlreadyRecordedError extends Error {
  constructor() {
    super('El pedido ya tiene un pago aprobado.')
    this.name = 'PaymentAlreadyRecordedError'
  }
}

export function isPaymentAlreadyRecorded(error: unknown): boolean {
  return error instanceof PaymentAlreadyRecordedError
}
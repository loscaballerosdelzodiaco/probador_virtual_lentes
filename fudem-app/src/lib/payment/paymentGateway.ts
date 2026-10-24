/**
 * HU5 / T6: pasarela de pago simulada. No hace cobros reales ni llamadas de red (RN6).
 *
 * Tarjetas de prueba (cualquier vencimiento futuro y CVV válido):
 *   4242 4242 4242 4242  aprobado
 *   4000 0000 0000 0002  rechazado: tarjeta declinada (E1)
 *   4000 0000 0000 9995  rechazado: fondos insuficientes (E1)
 *   4000 0000 0000 0119  el servicio no responde (E3): lanza PaymentGatewayError
 *   Cualquier otro número válido: aprobado
 *
 * RN2: solo se lee el número y del resultado solo salen los últimos 4 dígitos.
 * Nunca se devuelve, guarda ni imprime el número completo, el titular ni el CVV.
 */
import type { CardData } from './cardValidation'

export const TEST_CARD_APPROVED = '4242424242424242'
export const TEST_CARD_DECLINED = '4000000000000002'
export const TEST_CARD_INSUFFICIENT_FUNDS = '4000000000009995'
export const TEST_CARD_NO_RESPONSE = '4000000000000119'

/** Espera simulada de la pasarela; en las pruebas se usa 0. */
export const SIMULATED_DELAY_MS = 1000

const MIN_CARD_DIGITS = 13
const MAX_CARD_DIGITS = 19

/** Solo para el mensaje de E1 (T8); la tabla pago no lo guarda. */
export type MotivoRechazo = 'declinada' | 'fondos_insuficientes'

/** estado y ultimos_digitos calzan con las columnas de la tabla pago (T3). */
export type ResultadoPago =
  | { estado: 'aprobado'; ultimos_digitos: string }
  | { estado: 'rechazado'; motivo: MotivoRechazo; ultimos_digitos: string }

export type PaymentGatewayOptions = {
  delayMs?: number
}

export type PaymentGatewayErrorCode =
  | 'sin_respuesta' // E3: no se realizó ningún cobro
  | 'monto_invalido' // error de programación
  | 'numero_invalido' // llegó un número sin validar

// Textos internos: no son mensajes para la pantalla (T8 y T9) y nunca llevan datos de la tarjeta.
const GATEWAY_ERROR_TEXT: Record<PaymentGatewayErrorCode, string> = {
  sin_respuesta: 'Pasarela simulada: el servicio no respondió.',
  monto_invalido: 'Pasarela simulada: el monto debe ser mayor que 0.',
  numero_invalido: 'Pasarela simulada: el número de tarjeta no tiene los dígitos esperados.',
}

export class PaymentGatewayError extends Error {
  readonly code: PaymentGatewayErrorCode

  constructor(code: PaymentGatewayErrorCode) {
    super(GATEWAY_ERROR_TEXT[code])
    this.name = 'PaymentGatewayError'
    this.code = code
  }
}

/** T9: distingue E3 (sin respuesta) de un pago rechazado. */
export function isGatewayUnavailable(error: unknown): boolean {
  return error instanceof PaymentGatewayError && error.code === 'sin_respuesta'
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function processPayment(
  card: CardData,
  monto: number,
  options: PaymentGatewayOptions = {},
): Promise<ResultadoPago> {
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new PaymentGatewayError('monto_invalido')
  }

  const digits = card.numero.replace(/[\s-]/g, '')
  if (
    !/^\d+$/.test(digits) ||
    digits.length < MIN_CARD_DIGITS ||
    digits.length > MAX_CARD_DIGITS
  ) {
    throw new PaymentGatewayError('numero_invalido')
  }

  await wait(options.delayMs ?? SIMULATED_DELAY_MS)

  const lastDigits = digits.slice(-4)

  if (digits === TEST_CARD_NO_RESPONSE) {
    throw new PaymentGatewayError('sin_respuesta')
  }
  if (digits === TEST_CARD_DECLINED) {
    return { estado: 'rechazado', motivo: 'declinada', ultimos_digitos: lastDigits }
  }
  if (digits === TEST_CARD_INSUFFICIENT_FUNDS) {
    return {
      estado: 'rechazado',
      motivo: 'fondos_insuficientes',
      ultimos_digitos: lastDigits,
    }
  }
  return { estado: 'aprobado', ultimos_digitos: lastDigits }
}

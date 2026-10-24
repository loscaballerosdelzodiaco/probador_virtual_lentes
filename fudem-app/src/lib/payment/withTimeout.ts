import { PaymentGatewayError } from './paymentGateway'

/** Tiempo máximo de espera a la pasarela antes de tratarla como sin respuesta. */
export const GATEWAY_TIMEOUT_MS = 10_000

/**
 * E3: si la pasarela no responde a tiempo, se rechaza con el mismo error que
 * usa la pasarela cuando no responde (isGatewayUnavailable lo reconoce).
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number = GATEWAY_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new PaymentGatewayError('sin_respuesta'))
    }, ms)

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}
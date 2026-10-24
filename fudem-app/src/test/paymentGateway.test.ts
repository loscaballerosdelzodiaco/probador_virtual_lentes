import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CardData } from '../lib/payment/cardValidation'
import {
  PaymentGatewayError,
  SIMULATED_DELAY_MS,
  isGatewayUnavailable,
  processPayment,
} from '../lib/payment/paymentGateway'

const NO_DELAY = { delayMs: 0 }

function tarjeta(overrides: Partial<CardData> = {}): CardData {
  return {
    numero: '4242 4242 4242 4242',
    titular: 'Ana López',
    vencimiento: '12/28',
    cvv: '987',
    ...overrides,
  }
}

async function gatewayError(promise: Promise<unknown>): Promise<PaymentGatewayError> {
  const error = await promise.catch((reason: unknown) => reason)
  expect(error).toBeInstanceOf(PaymentGatewayError)
  return error as PaymentGatewayError
}

describe('pasarela de pago simulada', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('aprueba la tarjeta de prueba 4242', async () => {
    await expect(processPayment(tarjeta(), 99, NO_DELAY)).resolves.toEqual({
      estado: 'aprobado',
      ultimos_digitos: '4242',
    })
  })

  it('rechaza la tarjeta declinada (E1)', async () => {
    await expect(
      processPayment(tarjeta({ numero: '4000 0000 0000 0002' }), 99, NO_DELAY),
    ).resolves.toEqual({
      estado: 'rechazado',
      motivo: 'declinada',
      ultimos_digitos: '0002',
    })
  })

  it('rechaza por fondos insuficientes (E1)', async () => {
    await expect(
      processPayment(tarjeta({ numero: '4000 0000 0000 9995' }), 99, NO_DELAY),
    ).resolves.toEqual({
      estado: 'rechazado',
      motivo: 'fondos_insuficientes',
      ultimos_digitos: '9995',
    })
  })

  it('falla de forma reconocible cuando el servicio no responde (E3)', async () => {
    const error = await gatewayError(
      processPayment(tarjeta({ numero: '4000 0000 0000 0119' }), 99, NO_DELAY),
    )
    expect(error.code).toBe('sin_respuesta')
    expect(isGatewayUnavailable(error)).toBe(true)
  })

  it('no confunde otros errores con el servicio sin respuesta', () => {
    expect(isGatewayUnavailable(new Error('otra falla'))).toBe(false)
    expect(isGatewayUnavailable(new PaymentGatewayError('monto_invalido'))).toBe(false)
  })

  it('aprueba cualquier otro número válido, con espacios o guiones', async () => {
    await expect(
      processPayment(tarjeta({ numero: '5555-5555-5555-4444' }), 99, NO_DELAY),
    ).resolves.toEqual({ estado: 'aprobado', ultimos_digitos: '4444' })
    await expect(
      processPayment(tarjeta({ numero: '378282246310005' }), 99, NO_DELAY),
    ).resolves.toEqual({ estado: 'aprobado', ultimos_digitos: '0005' })
  })

  it('falla con un monto que no es mayor que 0', async () => {
    for (const monto of [0, -5, Number.NaN]) {
      const error = await gatewayError(processPayment(tarjeta(), monto, NO_DELAY))
      expect(error.code).toBe('monto_invalido')
    }
  })

  it('falla de forma segura si el número no tiene dígitos suficientes', async () => {
    for (const numero of ['', '4242', '4242 abcd 4242 4242']) {
      const error = await gatewayError(processPayment(tarjeta({ numero }), 99, NO_DELAY))
      expect(error.code).toBe('numero_invalido')
    }
  })

  it('el resultado solo trae el estado y los últimos 4 dígitos (RN2)', async () => {
    const result = await processPayment(tarjeta(), 99, NO_DELAY)

    expect(Object.keys(result).sort()).toEqual(['estado', 'ultimos_digitos'])
    expect(result.ultimos_digitos).toMatch(/^\d{4}$/)
  })

  it('no expone el número completo, el titular ni el CVV (RN2)', async () => {
    const card = tarjeta({ numero: '4000 0000 0000 0002' })
    const result = JSON.stringify(await processPayment(card, 99, NO_DELAY))

    expect(result).not.toMatch(/4000000000000002|4000 0000 0000 0002/)
    expect(result).not.toMatch(/Ana López/)
    expect(result).not.toMatch(/987/)

    for (const [numero, monto] of [
      ['4000 0000 0000 0119', 99],
      ['4242 4242 4242 4242', 0],
      ['4242 4242', 99],
    ] as const) {
      const error = await gatewayError(
        processPayment(tarjeta({ numero }), monto, NO_DELAY),
      )
      const text = `${error.message} ${String(error.cause ?? '')}`
      expect(text).not.toMatch(/\d{4}/)
      expect(text).not.toMatch(/Ana López|987/)
    }
  })

  it('espera alrededor de 1 segundo por defecto, sin llamadas de red (RN6)', async () => {
    vi.useFakeTimers()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    let done = false

    const payment = processPayment(tarjeta(), 99).then((result) => {
      done = true
      return result
    })

    await vi.advanceTimersByTimeAsync(SIMULATED_DELAY_MS - 1)
    expect(done).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    await expect(payment).resolves.toMatchObject({ estado: 'aprobado' })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})

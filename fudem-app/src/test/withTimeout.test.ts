import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isGatewayUnavailable } from '../lib/payment/paymentGateway'
import { withTimeout } from '../lib/payment/withTimeout'

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('devuelve el resultado si la pasarela responde a tiempo', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok')
  })

  it('limpia el temporizador cuando responde', async () => {
    await withTimeout(Promise.resolve(1), 1000)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rechaza como "sin respuesta" si tarda demasiado (E3)', async () => {
    const never = new Promise<string>(() => {})
    const caught = withTimeout(never, 1000).catch((error: unknown) => error)

    await vi.advanceTimersByTimeAsync(1000)

    expect(isGatewayUnavailable(await caught)).toBe(true)
  })

  it('propaga el error original si la pasarela falla antes', async () => {
    await expect(
      withTimeout(Promise.reject(new Error('boom')), 1000),
    ).rejects.toThrow('boom')
  })
})
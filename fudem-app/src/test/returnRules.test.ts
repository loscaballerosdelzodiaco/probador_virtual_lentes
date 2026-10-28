import { describe, expect, it } from 'vitest'
import { RETURN_MESSAGES } from '../lib/returns/messages'
import {
  MSG_ALREADY_REQUESTED,
  MSG_OUT_OF_WINDOW,
  RETURN_WINDOW_DAYS,
  evaluateEligibility,
  hasActiveReturn,
  returnDeadline,
} from '../lib/returns/returnRules'

const now = new Date('2026-10-27T12:00:00Z')
const DAY_MS = 24 * 60 * 60 * 1000

function entregado(fechaEntrega: string | null) {
  return { id: 1, estado: 'entregado' as const, fechaEntrega }
}

function hace(dias: number) {
  return new Date(now.getTime() - dias * DAY_MS).toISOString()
}

describe('evaluateEligibility', () => {
  it('permite devolver dentro del plazo de 8 días (RN2)', () => {
    const result = evaluateEligibility(entregado('2026-10-22T12:00:00Z'), [], now)
    expect(result.eligible).toBe(true)
  })

  it('permite devolver justo en el día 8 (fecha_entrega + 8 días exactos)', () => {
    const result = evaluateEligibility(entregado(hace(RETURN_WINDOW_DAYS)), [], now)
    expect(result.eligible).toBe(true)
  })

  it('A1: rechaza el pedido en el día 9', () => {
    const result = evaluateEligibility(entregado(hace(9)), [], now)
    expect(result).toMatchObject({ eligible: false, message: MSG_OUT_OF_WINDOW })
  })

  it('A1: rechaza un minuto después del límite, igual que el trigger', () => {
    const delivered = new Date(now.getTime() - RETURN_WINDOW_DAYS * DAY_MS - 60_000)
    const result = evaluateEligibility(entregado(delivered.toISOString()), [], now)
    expect(result).toMatchObject({ eligible: false, message: MSG_OUT_OF_WINDOW })
  })

  it('A1: rechaza un pedido fuera del plazo', () => {
    const result = evaluateEligibility(entregado('2026-10-10T12:00:00Z'), [], now)
    expect(result).toMatchObject({ eligible: false, message: MSG_OUT_OF_WINDOW })
    expect(MSG_OUT_OF_WINDOW).toBe('Este pedido ya no cumple el plazo de devolución')
  })

  it('A1: rechaza un pedido sin fecha de entrega', () => {
    const result = evaluateEligibility(entregado(null), [], now)
    expect(result).toMatchObject({ eligible: false, message: MSG_OUT_OF_WINDOW })
  })

  it('RN1: rechaza un pedido que no está entregado', () => {
    const result = evaluateEligibility(
      { id: 1, estado: 'pagado', fechaEntrega: null },
      [],
      now,
    )
    expect(result).toMatchObject({
      eligible: false,
      message: RETURN_MESSAGES.notDelivered,
    })
    expect(RETURN_MESSAGES.notDelivered).toBe('Este pedido aún no ha sido entregado')
  })

  it('RN1 tiene prioridad sobre A2', () => {
    const result = evaluateEligibility(
      { id: 1, estado: 'pendiente de pago', fechaEntrega: null },
      [{ pedidoId: 1, estado: 'en revision' }],
      now,
    )
    expect(result).toMatchObject({ message: RETURN_MESSAGES.notDelivered })
  })

  it.each(['en revision', 'aprobada', 'completada'] as const)(
    'A2 / RN4: rechaza un pedido con devolución "%s"',
    (estado) => {
      const result = evaluateEligibility(
        entregado('2026-10-25T12:00:00Z'),
        [{ pedidoId: 1, estado }],
        now,
      )
      expect(result).toMatchObject({ eligible: false, message: MSG_ALREADY_REQUESTED })
    },
  )

  it('A2: el texto es el de la historia de usuario', () => {
    expect(MSG_ALREADY_REQUESTED).toBe('Este pedido ya tiene una devolución solicitada')
  })

  it('A2 tiene prioridad sobre A1', () => {
    const result = evaluateEligibility(
      entregado('2026-01-01T12:00:00Z'),
      [{ pedidoId: 1, estado: 'aprobada' }],
      now,
    )
    expect(result).toMatchObject({ eligible: false, message: MSG_ALREADY_REQUESTED })
  })

  it('una devolución rechazada libera el pedido', () => {
    expect(hasActiveReturn(1, [{ pedidoId: 1, estado: 'rechazada' }])).toBe(false)
    const result = evaluateEligibility(
      entregado('2026-10-25T12:00:00Z'),
      [{ pedidoId: 1, estado: 'rechazada' }],
      now,
    )
    expect(result.eligible).toBe(true)
  })

  it('ignora devoluciones de otros pedidos', () => {
    expect(hasActiveReturn(1, [{ pedidoId: 2, estado: 'en revision' }])).toBe(false)
  })

  it('calcula el límite sumando 8 × 24 horas a la fecha de entrega', () => {
    const deadline = returnDeadline('2026-10-20T15:30:00Z')
    expect(deadline.toISOString()).toBe('2026-10-28T15:30:00.000Z')
  })
})

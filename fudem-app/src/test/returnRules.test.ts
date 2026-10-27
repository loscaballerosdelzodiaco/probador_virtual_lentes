import { describe, expect, it } from 'vitest'
import {
  MSG_ALREADY_REQUESTED,
  MSG_OUT_OF_WINDOW,
  RETURN_WINDOW_DAYS,
  evaluateEligibility,
  hasActiveReturn,
  returnDeadline,
} from '../lib/returns/returnRules'

const now = new Date('2026-10-27T12:00:00Z')

describe('evaluateEligibility', () => {
  it('permite devolver dentro del plazo de 8 días (RN2)', () => {
    const result = evaluateEligibility(
      { id: 1, fechaEntrega: '2026-10-22T12:00:00Z' },
      [],
      now,
    )
    expect(result.eligible).toBe(true)
  })

  it('permite devolver justo en el último día del plazo', () => {
    const delivered = new Date(now)
    delivered.setDate(delivered.getDate() - RETURN_WINDOW_DAYS)
    const result = evaluateEligibility(
      { id: 1, fechaEntrega: delivered.toISOString() },
      [],
      now,
    )
    expect(result.eligible).toBe(true)
  })

  it('A1: rechaza un pedido fuera del plazo', () => {
    const result = evaluateEligibility(
      { id: 1, fechaEntrega: '2026-10-10T12:00:00Z' },
      [],
      now,
    )
    expect(result).toMatchObject({ eligible: false, message: MSG_OUT_OF_WINDOW })
    expect(MSG_OUT_OF_WINDOW).toBe('Este pedido ya no cumple el plazo de devolución')
  })

  it('A1: rechaza un pedido sin fecha de entrega', () => {
    const result = evaluateEligibility({ id: 1, fechaEntrega: null }, [], now)
    expect(result).toMatchObject({ eligible: false, message: MSG_OUT_OF_WINDOW })
  })

  it('A2 / RN4: rechaza un pedido con devolución en proceso', () => {
    const result = evaluateEligibility(
      { id: 1, fechaEntrega: '2026-10-25T12:00:00Z' },
      [{ pedidoId: 1, estado: 'en revision' }],
      now,
    )
    expect(result).toMatchObject({ eligible: false, message: MSG_ALREADY_REQUESTED })
    expect(MSG_ALREADY_REQUESTED).toBe('Este pedido ya tiene una devolución solicitada')
  })

  it('A2 tiene prioridad sobre A1', () => {
    const result = evaluateEligibility(
      { id: 1, fechaEntrega: '2026-01-01T12:00:00Z' },
      [{ pedidoId: 1, estado: 'aprobada' }],
      now,
    )
    expect(result).toMatchObject({ eligible: false, message: MSG_ALREADY_REQUESTED })
  })

  it('una devolución rechazada libera el pedido', () => {
    expect(hasActiveReturn(1, [{ pedidoId: 1, estado: 'rechazada' }])).toBe(false)
    const result = evaluateEligibility(
      { id: 1, fechaEntrega: '2026-10-25T12:00:00Z' },
      [{ pedidoId: 1, estado: 'rechazada' }],
      now,
    )
    expect(result.eligible).toBe(true)
  })

  it('ignora devoluciones de otros pedidos', () => {
    expect(hasActiveReturn(1, [{ pedidoId: 2, estado: 'en revision' }])).toBe(false)
  })

  it('calcula el límite sumando el plazo a la fecha de entrega', () => {
    const deadline = returnDeadline('2026-10-20T00:00:00Z')
    expect(deadline.toISOString().slice(0, 10)).toBe('2026-10-28')
  })
})

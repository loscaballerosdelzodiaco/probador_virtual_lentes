import { describe, expect, it } from 'vitest'
import { returnStatusInfo } from '../lib/returns/returnStatus'

describe('returnStatusInfo', () => {
  it.each([
    ['en revision', 'En revisión', 'Estamos revisando tu solicitud.', 'pending'],
    ['aprobada', 'Aprobada', 'Tu solicitud fue aprobada.', 'success'],
    ['rechazada', 'Rechazada', 'Tu solicitud fue rechazada.', 'error'],
    ['completada', 'Completada', 'Tu devolución fue completada.', 'done'],
  ])('%s se muestra como "%s"', (estado, label, description, tone) => {
    expect(returnStatusInfo(estado)).toEqual({ label, description, tone })
  })

  it('un estado desconocido se muestra como "En revisión"', () => {
    expect(returnStatusInfo('otro').label).toBe('En revisión')
  })

  it('no promete reembolsos ni recolecciones (fuera del alcance de la HU7)', () => {
    const texts = ['en revision', 'aprobada', 'rechazada', 'completada']
      .map((estado) => returnStatusInfo(estado).description.toLowerCase())
      .join(' ')
    expect(texts).not.toMatch(/reembols|recolec|dinero|pago/)
  })
})

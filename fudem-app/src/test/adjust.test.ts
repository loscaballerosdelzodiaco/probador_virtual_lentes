import { describe, expect, it } from 'vitest'
import { PHOTO_POSITION_UNIT, POSITION_STEP } from '../lib/tryOn/adjust'

describe('ajuste de posición', () => {
  it('un toque mueve una fracción pequeña de la foto, no varios puntos porcentuales', () => {
    const on4000pxPhoto = POSITION_STEP * PHOTO_POSITION_UNIT * 4000
    expect(on4000pxPhoto).toBeLessThan(8)
    expect(on4000pxPhoto).toBeGreaterThan(2)
  })
})

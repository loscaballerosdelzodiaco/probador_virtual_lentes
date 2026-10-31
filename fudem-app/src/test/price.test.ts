import { describe, expect, it } from 'vitest'
import { formatPrice } from '../lib/price'

describe('formatPrice', () => {
  it('muestra el precio en dólares con dos decimales', () => {
    expect(formatPrice(89.5)).toBe('$89.50')
  })

  it('agrega los decimales a un número entero', () => {
    expect(formatPrice(120)).toBe('$120.00')
  })
})

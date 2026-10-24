import { describe, expect, it } from 'vitest'
import {
  passesLuhn,
  validateCard,
  type CardData,
} from '../lib/payment/cardValidation'

// 23 de octubre de 2026
const TODAY = new Date(2026, 9, 23)

function tarjeta(overrides: Partial<CardData> = {}): CardData {
  return {
    numero: '4242 4242 4242 4242',
    titular: 'Ana López',
    vencimiento: '12/28',
    cvv: '123',
    ...overrides,
  }
}

describe('validación de tarjeta', () => {
  it('acepta una tarjeta válida', () => {
    expect(validateCard(tarjeta(), TODAY)).toEqual({})
    expect(validateCard(tarjeta({ numero: '4242-4242-4242-4242' }), TODAY)).toEqual({})
    expect(validateCard(tarjeta({ titular: "María O'Neil-Ñuñez" }), TODAY)).toEqual({})
  })

  it('exige los cuatro campos', () => {
    const errors = validateCard(
      { numero: '', titular: '', vencimiento: '', cvv: '' },
      TODAY,
    )
    expect(errors.numero).toMatch(/Número de tarjeta: este campo es obligatorio/)
    expect(errors.titular).toMatch(/Titular: este campo es obligatorio/)
    expect(errors.vencimiento).toMatch(/Vencimiento: este campo es obligatorio/)
    expect(errors.cvv).toMatch(/CVV: este campo es obligatorio/)
  })

  it('rechaza número con letras, muy corto o que no pasa Luhn', () => {
    expect(validateCard(tarjeta({ numero: '4242 abcd 4242' }), TODAY).numero).toMatch(/solo números/)
    expect(validateCard(tarjeta({ numero: '4242 4242' }), TODAY).numero).toMatch(/entre 13 y 19/)
    expect(validateCard(tarjeta({ numero: '4242 4242 4242 4241' }), TODAY).numero).toMatch(/no es válido/)
  })

  it('aplica el algoritmo de Luhn', () => {
    expect(passesLuhn('4242424242424242')).toBe(true)
    expect(passesLuhn('378282246310005')).toBe(true)
    expect(passesLuhn('4242424242424241')).toBe(false)
  })

  it('rechaza vencimiento con mal formato o mes fuera de 01 a 12', () => {
    expect(validateCard(tarjeta({ vencimiento: '1228' }), TODAY).vencimiento).toMatch(/MM\/AA/)
    expect(validateCard(tarjeta({ vencimiento: '1/28' }), TODAY).vencimiento).toMatch(/MM\/AA/)
    expect(validateCard(tarjeta({ vencimiento: '13/28' }), TODAY).vencimiento).toMatch(/entre 01 y 12/)
    expect(validateCard(tarjeta({ vencimiento: '00/28' }), TODAY).vencimiento).toMatch(/entre 01 y 12/)
  })

  it('rechaza una tarjeta vencida y acepta el mes en curso', () => {
    expect(validateCard(tarjeta({ vencimiento: '09/26' }), TODAY).vencimiento).toMatch(/vencida/)
    expect(validateCard(tarjeta({ vencimiento: '12/25' }), TODAY).vencimiento).toMatch(/vencida/)
    expect(validateCard(tarjeta({ vencimiento: '10/26' }), TODAY).vencimiento).toBeUndefined()
  })

  it('rechaza un vencimiento a más de 20 años', () => {
    expect(validateCard(tarjeta({ vencimiento: '10/46' }), TODAY).vencimiento).toBeUndefined()
    expect(validateCard(tarjeta({ vencimiento: '11/46' }), TODAY).vencimiento).toMatch(/20 años/)
  })

  it('pide CVV de 3 dígitos, o de 4 con American Express', () => {
    const amex = '3782 8224 6310 005'
    expect(validateCard(tarjeta({ cvv: '1234' }), TODAY).cvv).toMatch(/3 dígitos/)
    expect(validateCard(tarjeta({ cvv: '12' }), TODAY).cvv).toMatch(/3 dígitos/)
    expect(validateCard(tarjeta({ numero: amex, cvv: '123' }), TODAY).cvv).toMatch(/4 dígitos/)
    expect(validateCard(tarjeta({ numero: amex, cvv: '1234' }), TODAY)).toEqual({})
    expect(validateCard(tarjeta({ cvv: '12a' }), TODAY).cvv).toMatch(/solo números/)
  })

  it('rechaza titular con números o de una sola letra', () => {
    expect(validateCard(tarjeta({ titular: 'Ana2' }), TODAY).titular).toMatch(/letras/)
    expect(validateCard(tarjeta({ titular: 'A' }), TODAY).titular).toMatch(/2 caracteres/)
  })

  it('no incluye los datos escritos en los mensajes (RN2)', () => {
    const errors = validateCard(
      tarjeta({ numero: '4242 4242 4242 4241', cvv: '98' }),
      TODAY,
    )
    expect(errors.numero).not.toMatch(/4241/)
    expect(errors.cvv).not.toMatch(/98/)
  })
})

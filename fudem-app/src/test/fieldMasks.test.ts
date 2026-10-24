import { describe, expect, it } from 'vitest'
import {
  maskCardExpiry,
  maskCardNumber,
  maskCvv,
  maskDui,
  sanitizeName,
} from '../lib/fieldMasks'
import {
  composeInternationalPhone,
  maskNationalPhone,
  parsePhoneInput,
} from '../lib/phoneCountries'

describe('máscaras de formulario', () => {
  it('formatea el DUI al escribir y limita a 9 dígitos', () => {
    expect(maskDui('00000000')).toBe('00000000')
    expect(maskDui('000000000')).toBe('00000000-0')
    expect(maskDui('00000000-01')).toBe('00000000-0')
    expect(maskDui('12ab3456cd7')).toBe('1234567')
  })

  it('conserva el DUI al borrar y pegar', () => {
    expect(maskDui('00000000-')).toBe('00000000')
    expect(maskDui('12345678-9 extra')).toBe('12345678-9')
  })

  it('formatea el teléfono nacional de El Salvador como cuatro y cuatro', () => {
    expect(maskNationalPhone('7000', 'SV')).toBe('7000')
    expect(maskNationalPhone('70000000', 'SV')).toBe('7000-0000')
    expect(maskNationalPhone('7000-0000', 'SV')).toBe('7000-0000')
    expect(composeInternationalPhone('SV', '7000-0000')).toBe('+50370000000')
  })

  it('detecta el país al pegar un número internacional y formatea el nacional', () => {
    expect(parsePhoneInput('+12025550123', 'SV')).toEqual({
      iso: 'US',
      national: '202-555-0123',
    })
    expect(parsePhoneInput('+503 7000 0000', 'US')).toEqual({
      iso: 'SV',
      national: '7000-0000',
    })
    expect(composeInternationalPhone('US', '202-555-0123')).toBe('+12025550123')
  })

  it('no pierde dígitos al borrar o pegar un teléfono nacional', () => {
    expect(maskNationalPhone('7000-000', 'SV')).toBe('7000-000')
    expect(maskNationalPhone('70000000999', 'SV')).toBe('7000-0000')
  })

  it('solo deja letras, tildes, ñ y espacios en el nombre', () => {
    expect(sanitizeName('María Ñuñez')).toBe('María Ñuñez')
    expect(sanitizeName('Ana2')).toBe('Ana')
    expect(sanitizeName('José-Luis')).toBe('José-Luis')
  })

  it('agrupa el número de tarjeta de cuatro en cuatro y limita a 19 dígitos', () => {
    expect(maskCardNumber('4242')).toBe('4242')
    expect(maskCardNumber('42424242')).toBe('4242 4242')
    expect(maskCardNumber('4242-4242-4242-4242')).toBe('4242 4242 4242 4242')
    expect(maskCardNumber('4242 abcd 4242')).toBe('4242 4242')
    expect(maskCardNumber('12345678901234567890123')).toBe('1234 5678 9012 3456 789')
  })

  it('pone la barra del vencimiento y limita a MM/AA', () => {
    expect(maskCardExpiry('12')).toBe('12')
    expect(maskCardExpiry('122')).toBe('12/2')
    expect(maskCardExpiry('1228')).toBe('12/28')
    expect(maskCardExpiry('12/289')).toBe('12/28')
  })

  it('conserva el vencimiento al borrar la barra', () => {
    expect(maskCardExpiry('12/')).toBe('12')
  })

  it('deja solo dígitos en el CVV, máximo 4', () => {
    expect(maskCvv('12a3')).toBe('123')
    expect(maskCvv('123456')).toBe('1234')
  })
})

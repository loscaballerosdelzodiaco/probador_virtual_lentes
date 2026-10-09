import { describe, expect, it } from 'vitest'
import { maskDui, sanitizeName } from '../lib/fieldMasks'
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
})

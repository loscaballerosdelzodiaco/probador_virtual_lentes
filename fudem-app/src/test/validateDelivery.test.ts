import { describe, expect, it } from 'vitest'
import type { DeliveryFormData } from '../lib/delivery/validateDelivery'
import {
  DELIVERY_ADDRESS_INCOMPLETE_MESSAGE,
  DELIVERY_BRANCH_REQUIRED_MESSAGE,
  DELIVERY_METHOD_REQUIRED_MESSAGE,
  DELIVERY_PHONE_INVALID_MESSAGE,
  validateDelivery,
} from '../lib/delivery/validateDelivery'

function form(overrides: Partial<DeliveryFormData> = {}): DeliveryFormData {
  return {
    method: null,
    departamentoId: '',
    municipioId: '',
    direccion: '',
    telefono: '',
    sucursalId: '',
    ...overrides,
  }
}

describe('validateDelivery', () => {
  it('exige una forma de entrega y no revisa el resto', () => {
    expect(validateDelivery(form())).toEqual({
      method: DELIVERY_METHOD_REQUIRED_MESSAGE,
    })
  })

  it('acepta un envío a domicilio completo', () => {
    expect(
      validateDelivery(
        form({
          method: 'domicilio',
          departamentoId: 'ss',
          municipioId: 'ss-soyapango',
          direccion: 'Calle 1',
          telefono: '7000-0000',
          sucursalId: '',
        }),
      ),
    ).toEqual({})
  })

  it('marca la dirección vacía y no exige sucursal en un envío', () => {
    const errors = validateDelivery(
      form({
        method: 'domicilio',
        departamentoId: 'ss',
        municipioId: 'ss-soyapango',
        direccion: '   ',
        telefono: '70000000',
        sucursalId: '',
      }),
    )
    expect(errors.direccion).toBe(DELIVERY_ADDRESS_INCOMPLETE_MESSAGE)
    expect(errors.sucursalId).toBeUndefined()
  })

  it('exige sucursal en un retiro y no valida la dirección', () => {
    const errors = validateDelivery(
      form({
        method: 'sucursal',
        sucursalId: '',
        departamentoId: '',
        municipioId: '',
        direccion: '',
        telefono: 'abc',
      }),
    )
    expect(errors).toEqual({ sucursalId: DELIVERY_BRANCH_REQUIRED_MESSAGE })
  })

  it('rechaza un teléfono con letras o longitud distinta de 8 dígitos', () => {
    const base = {
      method: 'domicilio' as const,
      departamentoId: 'ss',
      municipioId: 'ss-soyapango',
      direccion: 'Calle 1',
    }
    expect(validateDelivery(form({ ...base, telefono: '70ab0000' })).telefono).toBe(
      DELIVERY_PHONE_INVALID_MESSAGE,
    )
    expect(validateDelivery(form({ ...base, telefono: '7000' })).telefono).toBe(
      DELIVERY_PHONE_INVALID_MESSAGE,
    )
  })
})

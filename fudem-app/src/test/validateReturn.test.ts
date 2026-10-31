import { describe, expect, it } from 'vitest'
import { hasReturnErrors, validateReturnForm } from '../lib/returns/validateReturn'

const completo = {
  motivo: 'No me queda bien' as const,
  forma: 'cambio' as const,
  condicionesConfirmadas: true,
}

describe('validateReturnForm', () => {
  it('sin errores cuando motivo, forma y condiciones están completos', () => {
    const errors = validateReturnForm(completo)
    expect(errors).toEqual({})
    expect(hasReturnErrors(errors)).toBe(false)
  })

  it('RN5: exige el motivo', () => {
    expect(validateReturnForm({ ...completo, motivo: '' })).toEqual({
      motivo: 'Motivo de la devolución: selecciona el motivo de la devolución.',
    })
  })

  it('exige la forma de devolución', () => {
    expect(validateReturnForm({ ...completo, forma: '' })).toEqual({
      forma: 'Forma de devolución: selecciona reembolso o cambio.',
    })
  })

  it('RN3: exige confirmar las condiciones', () => {
    expect(validateReturnForm({ ...completo, condicionesConfirmadas: false })).toEqual({
      condicionesConfirmadas:
        'Condiciones: marca la casilla para confirmar que los lentes están sin uso y en su empaque original.',
    })
  })

  it('devuelve los tres errores si el formulario está vacío', () => {
    const errors = validateReturnForm({ motivo: '', forma: '', condicionesConfirmadas: false })
    expect(Object.keys(errors)).toEqual(['motivo', 'forma', 'condicionesConfirmadas'])
    expect(hasReturnErrors(errors)).toBe(true)
  })
})

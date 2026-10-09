import { describe, expect, it } from 'vitest'
import { validateLogin, validateRegistro } from '../lib/registroValidation'
import type { NuevoUsuario } from '../services/registroService'

function usuario(overrides: Partial<NuevoUsuario> = {}): NuevoUsuario {
  return {
    dui: '00000000-0',
    nombre: 'Ana',
    apellido: 'López',
    fecha_nacimiento: '1990-01-01',
    correo: 'ana@test.com',
    telefono: '70000000',
    contrasena: '12345678',
    ...overrides,
  }
}

describe('validación de registro', () => {
  it('acepta nombre con tildes y ñ, DUI, teléfono nacional e internacional', () => {
    expect(validateRegistro(usuario())).toEqual({})
    expect(
      validateRegistro(usuario({ nombre: 'María', apellido: 'Muñoz', telefono: '+12025550123' })),
    ).toEqual({})
  })

  it('rechaza números en nombre y apellido', () => {
    expect(validateRegistro(usuario({ nombre: 'Ana2' })).nombre).toMatch(/letras/)
    expect(validateRegistro(usuario({ apellido: 'Lopez1' })).apellido).toMatch(/letras/)
  })

  it('rechaza DUI con formato inválido', () => {
    expect(validateRegistro(usuario({ dui: '123' })).dui).toMatch(/00000000-0/)
  })

  it('rechaza teléfono demasiado corto o con + en medio', () => {
    expect(validateRegistro(usuario({ telefono: '123' })).telefono).toMatch(/número completo/)
    expect(validateRegistro(usuario({ telefono: '70+000000' })).telefono).toMatch(/país/)
  })

  it('rechaza correo y contraseña inválidos', () => {
    expect(validateRegistro(usuario({ correo: 'ana' })).correo).toMatch(/correo válido/)
    expect(validateRegistro(usuario({ contrasena: '123' })).contrasena).toMatch(/8 caracteres/)
  })

  it('exige que la confirmación coincida', () => {
    expect(validateRegistro(usuario(), 'otra').contrasena).toMatch(/confirmación/)
  })
})

describe('validación de login', () => {
  it('acepta correo y contraseña presentes', () => {
    expect(validateLogin('ana@test.com', '12345678')).toEqual([])
  })

  it('rechaza correo inválido o contraseña vacía', () => {
    expect(validateLogin('ana', '123')).toEqual([
      'Correo: ingresa un correo válido, por ejemplo nombre@correo.com.',
    ])
    expect(validateLogin('ana@test.com', '')).toEqual([
      'Contraseña: este campo es obligatorio.',
    ])
  })
})

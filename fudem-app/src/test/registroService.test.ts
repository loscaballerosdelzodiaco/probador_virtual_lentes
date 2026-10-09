import { describe, expect, it } from 'vitest'
import {
  REGISTRO_DUPLICADO_MESSAGE,
  REGISTRO_ERROR_MESSAGE,
  REGISTRO_RATE_LIMIT_MESSAGE,
  buildSignupOptions,
  buildUsuarioProfile,
  messageFromSignupError,
} from '../services/registroService'

const usuario = {
  dui: '00000000-0',
  nombre: 'Ana',
  apellido: 'López',
  fecha_nacimiento: '1990-01-01',
  correo: 'ana@test.com',
  telefono: '+50370000000',
  contrasena: 'secreto123',
}

describe('errores de registro', () => {
  it('explica el límite de intentos de Supabase Auth', () => {
    expect(
      messageFromSignupError({
        message: 'Too Many Requests',
        status: 429,
      }),
    ).toBe(REGISTRO_RATE_LIMIT_MESSAGE)
    expect(
      messageFromSignupError({
        message: 'email rate limit exceeded',
        code: 'over_email_send_rate_limit',
      }),
    ).toBe(REGISTRO_RATE_LIMIT_MESSAGE)
  })

  it('detecta una cuenta ya registrada', () => {
    expect(
      messageFromSignupError({ message: 'User already registered' }),
    ).toBe(REGISTRO_DUPLICADO_MESSAGE)
  })

  it('usa el mensaje genérico para otros fallos de Auth', () => {
    expect(messageFromSignupError({ message: 'Database error' })).toBe(
      REGISTRO_ERROR_MESSAGE,
    )
  })
})

describe('datos enviados al crear la cuenta', () => {
  it('manda el perfil en metadatos de Auth, incluido el teléfono, sin la contraseña', () => {
    const payload = buildSignupOptions(usuario)

    expect(payload.email).toBe('ana@test.com')
    expect(payload.password).toBe('secreto123')
    expect(payload.options.data).toEqual({
      dui: '00000000-0',
      nombre: 'Ana',
      apellido: 'López',
      fecha_nacimiento: '1990-01-01',
      telefono: '+50370000000',
    })
    expect(payload.options.data).not.toHaveProperty('contrasena')
  })

  it('arma la fila de usuario con el UUID de Auth y sin la contraseña real', () => {
    const profile = buildUsuarioProfile('auth-user-id', usuario)

    expect(profile.id).toBe('auth-user-id')
    expect(profile.telefono).toBe('+50370000000')
    expect(profile.dui).toBe('00000000-0')
    expect(profile.nombre).toBe('Ana')
    expect(profile.apellido).toBe('López')
    expect(profile.correo).toBe('ana@test.com')
    expect(profile.contrasena).toBe('')
    expect(profile.contrasena).not.toBe(usuario.contrasena)
  })
})

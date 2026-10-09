import { describe, expect, it } from 'vitest'
import {
  REGISTRO_DUPLICADO_MESSAGE,
  REGISTRO_ERROR_MESSAGE,
  REGISTRO_RATE_LIMIT_MESSAGE,
  messageFromSignupError,
} from '../services/registroService'

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

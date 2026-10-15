import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LOGIN_ERROR_MESSAGE,
  SESSION_ERROR_MESSAGE,
  getCurrentSession,
  signIn,
  signOut,
} from '../services/authService'
import { supabase } from '../lib/supabase'
import { fakeSession } from './authMocks'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

describe('authService', () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.getSession).mockReset()
    vi.mocked(supabase.auth.signInWithPassword).mockReset()
    vi.mocked(supabase.auth.signOut).mockReset()
  })

  it('devuelve la sesión actual cuando Auth responde sin error', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: fakeSession },
      error: null,
    } as never)

    await expect(getCurrentSession()).resolves.toBe(fakeSession)
  })

  it('lanza el mensaje de sesión si Auth falla', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: { message: 'invalid jwt' },
    } as never)

    await expect(getCurrentSession()).rejects.toThrow(SESSION_ERROR_MESSAGE)
  })

  it('inicia sesión con correo y contraseña', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: fakeSession, user: null },
      error: null,
    } as never)

    await expect(signIn('ana@test.com', '12345678')).resolves.toBe(fakeSession)
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'ana@test.com',
      password: '12345678',
    })
  })

  it('lanza el mensaje de login si las credenciales no sirven', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    } as never)

    await expect(signIn('ana@test.com', 'mala')).rejects.toThrow(
      LOGIN_ERROR_MESSAGE,
    )
  })

  it('propaga el error de cierre de sesión', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: { message: 'network' },
    } as never)

    await expect(signOut()).rejects.toThrow(SESSION_ERROR_MESSAGE)
  })
})

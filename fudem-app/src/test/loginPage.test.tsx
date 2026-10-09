import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from '../pages/LoginPage'
import { LOGIN_ERROR_MESSAGE, signIn } from '../services/authService'
import { fakeSession } from './authMocks'

vi.mock('../services/authService', () => ({
  LOGIN_ERROR_MESSAGE:
    'No pudimos iniciar sesión. Revisa tu correo y contraseña.',
  signIn: vi.fn(),
}))

describe('formulario de login', () => {
  beforeEach(() => {
    vi.mocked(signIn).mockReset()
  })

  it('no aplica máscara a la contraseña y evita envíos duplicados', async () => {
    let finish: ((session: Session) => void) | undefined
    vi.mocked(signIn).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )

    const user = userEvent.setup()
    render(<LoginPage />)

    const password = screen.getByLabelText('Contraseña')
    await user.type(screen.getByLabelText('Correo'), 'ana@test.com')
    await user.type(password, '12345678')
    expect(password).toHaveAttribute('type', 'password')
    expect(password).toHaveValue('12345678')

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(screen.getByRole('button', { name: 'Iniciando sesión…' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Iniciando sesión…' }))
    expect(signIn).toHaveBeenCalledTimes(1)

    finish?.(fakeSession)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled()
    })
  })

  it('muestra el error de credenciales incorrectas', async () => {
    vi.mocked(signIn).mockRejectedValue(new Error(LOGIN_ERROR_MESSAGE))
    const user = userEvent.setup()
    render(<LoginPage />)
    await user.type(screen.getByLabelText('Correo'), 'ana@test.com')
    await user.type(screen.getByLabelText('Contraseña'), 'mala')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(LOGIN_ERROR_MESSAGE)
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RegistroPage } from '../pages/RegistroPage'

vi.mock('../services/registroService', () => ({
  REGISTRO_ERROR_MESSAGE:
    'No pudimos crear tu cuenta. Inténtalo de nuevo en unos momentos.',
  registrarUsuario: vi.fn(),
}))

describe('formulario de registro', () => {
  it('aplica máscaras al escribir, borrar y pegar', async () => {
    const user = userEvent.setup()
    render(<RegistroPage />)

    const dui = screen.getByLabelText('DUI')
    await user.type(dui, '123456789')
    expect(dui).toHaveValue('12345678-9')
    await user.type(dui, '{backspace}')
    expect(dui).toHaveValue('12345678')

    await user.clear(dui)
    await user.paste('987654321')
    expect(dui).toHaveValue('98765432-1')

    const telefono = screen.getByLabelText('Teléfono')
    expect(screen.getByLabelText('País')).toHaveValue('SV')
    await user.type(telefono, '70000000')
    expect(telefono).toHaveValue('7000-0000')
    await user.clear(telefono)
    await user.paste('+12025550123')
    expect(screen.getByLabelText('País')).toHaveValue('US')
    expect(telefono).toHaveValue('202-555-0123')

    await user.selectOptions(screen.getByLabelText('País'), 'SV')
    expect(telefono).toHaveValue('2025-5501')

    const nombre = screen.getByLabelText('Nombre')
    await user.type(nombre, 'Ana2 María')
    expect(nombre).toHaveValue('Ana María')
  })

  it('muestra errores de validación sin enviar', async () => {
    const user = userEvent.setup()
    render(<RegistroPage />)
    await user.click(screen.getByRole('button', { name: 'Registrarse' }))
    expect(screen.getByRole('alert')).toHaveTextContent('DUI')
    expect(screen.getByRole('alert')).toHaveTextContent('Contraseña')
  })
})

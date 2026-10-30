import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { getCurrentSession, subscribeToAuthChanges } from '../services/authService'
import {
  getMisDevoluciones,
  getPedidosEntregados,
  type PedidoEntregado,
} from '../services/returnService'
import { fakeSession } from './authMocks'

vi.mock('../services/authService', () => ({
  SESSION_ERROR_MESSAGE:
    'No pudimos validar tu sesión. Inténtalo de nuevo en unos momentos.',
  LOGIN_ERROR_MESSAGE:
    'No pudimos iniciar sesión. Revisa tu correo y contraseña.',
  getCurrentSession: vi.fn(),
  subscribeToAuthChanges: vi.fn(() => () => {}),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('../services/returnService', () => ({
  getPedidosEntregados: vi.fn(),
  getMisDevoluciones: vi.fn(),
  createDevolucion: vi.fn(),
}))

const pedidoEntregado: PedidoEntregado = {
  id: 1,
  numero: 'PED-000001',
  monto: 75,
  estado: 'entregado',
  fechaEntrega: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  productoNombre: 'Wayfarer Negro',
}

describe('ruta de devoluciones', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/devoluciones')
    vi.mocked(getCurrentSession).mockReset()
    vi.mocked(subscribeToAuthChanges).mockReset()
    vi.mocked(subscribeToAuthChanges).mockReturnValue(() => {})
    vi.mocked(getPedidosEntregados).mockResolvedValue([pedidoEntregado])
    vi.mocked(getMisDevoluciones).mockResolvedValue([])
  })

  it('con sesión muestra la pantalla de devoluciones y el enlace del menú', async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(fakeSession)
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Devolución de lentes' }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('radio', { name: /PED-000001/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Devoluciones' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('redirige al login si se abren las devoluciones sin sesión', async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null)
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Devolución de lentes' }),
    ).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
  })
})

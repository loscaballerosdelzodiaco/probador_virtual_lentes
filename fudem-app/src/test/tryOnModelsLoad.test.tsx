import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { getCurrentSession } from '../services/authService'
import { getAvailableProducts } from '../services/productService'
import type { ProductoDisponible } from '../services/productService'
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

vi.mock('../services/productService', () => ({
  CATALOG_LOAD_ERROR_MESSAGE:
    'No pudimos cargar el catálogo. Inténtalo de nuevo en unos momentos.',
  getAvailableProducts: vi.fn(),
  getAvailableProductById: vi.fn(),
}))

vi.mock('../lib/tryOn/cameraService', () => ({
  requestCameraAccess: vi.fn(async () => ({ ok: false, reason: 'unavailable' })),
  stopCamera: vi.fn(),
}))

function product(
  overrides: Partial<ProductoDisponible> & Pick<ProductoDisponible, 'id'>,
): ProductoDisponible {
  return {
    nombre: 'Modelo',
    precio: 10,
    sku: 'SKU',
    material: 'acetato',
    color: 'negro',
    medidas: '50-20',
    categoria: 'Hombres',
    url_imagen: 'ARNETTEAN7225.webp',
    disponible: true,
    ...overrides,
  }
}

describe('probador: modelos desde tryOnService', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/probador')
    vi.mocked(getCurrentSession).mockResolvedValue(fakeSession)
    vi.mocked(getAvailableProducts).mockReset()
  })

  it('solo lista productos disponibles con imagen de catálogo', async () => {
    vi.mocked(getAvailableProducts).mockResolvedValue([
      product({ id: 1, nombre: 'AN7225', url_imagen: 'ARNETTEAN7225.webp' }),
      product({ id: 2, nombre: 'Sin foto', url_imagen: null }),
      product({ id: 3, nombre: 'Vacío', url_imagen: '   ' }),
      product({ id: 4, nombre: '1432', url_imagen: 'BOSS14322M2.webp' }),
    ])

    render(<App />)

    expect(await screen.findByRole('option', { name: 'AN7225, Arnette' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '1432, Boss' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Sin foto/ })).toBeNull()
    expect(screen.queryByRole('option', { name: /Vacío/ })).toBeNull()
  })
})

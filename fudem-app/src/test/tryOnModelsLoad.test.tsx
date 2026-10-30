import { render, screen, waitFor } from '@testing-library/react'
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

describe('probador: lente desde la ruta (readAppRoute)', () => {
  beforeEach(() => {
    vi.mocked(getCurrentSession).mockResolvedValue(fakeSession)
    vi.mocked(getAvailableProducts).mockResolvedValue([
      product({ id: 1, nombre: 'AN7225', url_imagen: 'ARNETTEAN7225.webp' }),
      product({ id: 4, nombre: '1432', url_imagen: 'BOSS14322M2.webp' }),
    ])
  })

  it('con /probador#4 selecciona el lente del enlace', async () => {
    window.history.replaceState(null, '', '/probador#4')
    render(<App />)

    expect(await screen.findByRole('option', { name: '1432, Boss' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('option', { name: 'AN7225, Arnette' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(screen.getByRole('link', { name: 'Comprar' })).toHaveAttribute('href', '/pago#4')
  })

  it('sin id en la ruta selecciona el primer modelo', async () => {
    window.history.replaceState(null, '', '/probador')
    render(<App />)

    expect(await screen.findByRole('option', { name: 'AN7225, Arnette' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('link', { name: 'Comprar' })).toHaveAttribute('href', '/catalogo')
  })

  it('al cambiar el hash, el probador recibe el nuevo lente desde App', async () => {
    window.history.replaceState(null, '', '/probador#1')
    render(<App />)
    expect(await screen.findByRole('link', { name: 'Comprar' })).toHaveAttribute('href', '/pago#1')

    window.history.replaceState(null, '', '/probador#4')
    window.dispatchEvent(new HashChangeEvent('hashchange'))

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Comprar' })).toHaveAttribute('href', '/pago#4'),
    )
  })
})

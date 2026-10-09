import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { getAvailableProducts } from '../services/productService'
import type { ProductoDisponible } from '../services/productService'

vi.mock('../services/productService', () => ({
  CATALOG_LOAD_ERROR_MESSAGE:
    'No pudimos cargar el catálogo. Inténtalo de nuevo en unos momentos.',
  getAvailableProducts: vi.fn(),
}))

function product(
  id: number,
  nombre: string,
  categoria: string,
): ProductoDisponible {
  return {
    id,
    nombre,
    precio: 100,
    sku: `SKU-${id}`,
    material: 'Metal',
    color: 'Negro',
    medidas: '50-20',
    categoria,
    url_imagen: 'aviador.svg',
    disponible: true,
  }
}

const catalog = [
  product(1, 'Montura Hombre 1', 'Hombres'),
  product(2, 'Montura Mujer 1', 'Mujeres'),
  product(3, 'Montura Hombre 2', 'Hombre'),
]

describe('filtros del catálogo por categoría', () => {
  beforeEach(() => {
    vi.mocked(getAvailableProducts).mockReset()
    vi.mocked(getAvailableProducts).mockResolvedValue(catalog)
  })

  it('muestra todos los productos cuando no hay categoría seleccionada', async () => {
    render(<App />)

    expect(await screen.findByText('Montura Hombre 1')).toBeInTheDocument()
    expect(screen.getByText('Montura Mujer 1')).toBeInTheDocument()
    expect(screen.getByText('Montura Hombre 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveClass(
      'is-active',
    )
  })

  it('al seleccionar Hombre solo muestra esa categoría', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Montura Mujer 1')

    await user.click(screen.getByRole('button', { name: 'Hombre' }))

    expect(screen.getByText('Montura Hombre 1')).toBeInTheDocument()
    expect(screen.getByText('Montura Hombre 2')).toBeInTheDocument()
    expect(screen.queryByText('Montura Mujer 1')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hombre' })).toHaveClass(
      'is-active',
    )
  })

  it('al seleccionar Mujer solo muestra esa categoría', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Montura Hombre 1')

    await user.click(screen.getByRole('button', { name: 'Mujer' }))

    expect(screen.getByText('Montura Mujer 1')).toBeInTheDocument()
    expect(screen.queryByText('Montura Hombre 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Montura Hombre 2')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mujer' })).toHaveClass(
      'is-active',
    )
  })

  it('vuelve a mostrar todos al quitar la categoría', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Montura Mujer 1')

    await user.click(screen.getByRole('button', { name: 'Mujer' }))
    expect(screen.queryByText('Montura Hombre 1')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Todos' }))

    expect(screen.getByText('Montura Hombre 1')).toBeInTheDocument()
    expect(screen.getByText('Montura Mujer 1')).toBeInTheDocument()
    expect(screen.getByText('Montura Hombre 2')).toBeInTheDocument()
  })
})

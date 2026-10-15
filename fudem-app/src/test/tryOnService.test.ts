import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CATALOG_LOAD_ERROR_MESSAGE,
  getAvailableProductById,
  getAvailableProducts,
} from '../services/productService'
import type { ProductoDisponible } from '../services/productService'
import { getTryOnModelById, getTryOnModels } from '../lib/tryOn/tryOnService'

vi.mock('../services/productService', async () => {
  const actual = await vi.importActual<typeof import('../services/productService')>(
    '../services/productService',
  )
  return {
    ...actual,
    getAvailableProducts: vi.fn(),
    getAvailableProductById: vi.fn(),
  }
})

function product(
  overrides: Partial<ProductoDisponible> & Pick<ProductoDisponible, 'id'>,
): ProductoDisponible {
  return {
    nombre: 'AN7225',
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

describe('tryOnService', () => {
  beforeEach(() => {
    vi.mocked(getAvailableProducts).mockReset()
    vi.mocked(getAvailableProductById).mockReset()
  })

  it('devuelve modelos disponibles con imageUrl de catálogo', async () => {
    vi.mocked(getAvailableProducts).mockResolvedValue([
      product({ id: 1, url_imagen: 'ARNETTEAN7225.webp' }),
      product({ id: 2, nombre: 'BOSS0999', url_imagen: 'folder/BOSS0999.webp' }),
    ])

    await expect(getTryOnModels()).resolves.toEqual([
      {
        id: 1,
        nombre: 'AN7225',
        marca: 'Arnette',
        imageUrl: '/catalog/ARNETTEAN7225.webp',
        overlayUrl: '/tryon/ARNETTEAN7225.webp',
      },
      {
        id: 2,
        nombre: 'BOSS0999',
        marca: 'Boss',
        imageUrl: '/catalog/BOSS0999.webp',
        overlayUrl: '/tryon/BOSS0999.webp',
      },
    ])
  })

  it('omite productos sin imagen válida aunque estén disponibles', async () => {
    vi.mocked(getAvailableProducts).mockResolvedValue([
      product({ id: 1, url_imagen: 'ARNETTEAN7225.webp' }),
      product({ id: 2, url_imagen: null }),
      product({ id: 3, url_imagen: '   ' }),
      product({ id: 4, url_imagen: '' }),
    ])

    const models = await getTryOnModels()
    expect(models).toHaveLength(1)
    expect(models[0]?.id).toBe(1)
  })

  it('propaga el error de catálogo si falla la consulta', async () => {
    vi.mocked(getAvailableProducts).mockRejectedValue(
      new Error(CATALOG_LOAD_ERROR_MESSAGE),
    )

    await expect(getTryOnModels()).rejects.toThrow(CATALOG_LOAD_ERROR_MESSAGE)
  })

  it('devuelve un modelo por id cuando existe, está disponible y tiene imagen', async () => {
    vi.mocked(getAvailableProductById).mockResolvedValue(
      product({ id: 8, url_imagen: 'AIRFORCEAF01.webp' }),
    )

    await expect(getTryOnModelById(8)).resolves.toEqual({
      id: 8,
      nombre: 'AN7225',
      marca: 'Air Force',
      imageUrl: '/catalog/AIRFORCEAF01.webp',
      overlayUrl: '/tryon/AIRFORCEAF01.webp',
    })
  })

  it('devuelve null si el id no existe', async () => {
    vi.mocked(getAvailableProductById).mockResolvedValue(null)
    await expect(getTryOnModelById(99)).resolves.toBeNull()
  })

  it('devuelve null si el producto no está disponible o no tiene imagen', async () => {
    vi.mocked(getAvailableProductById).mockResolvedValue(
      product({ id: 3, disponible: false, url_imagen: 'ARNETTEAN7225.webp' }),
    )
    await expect(getTryOnModelById(3)).resolves.toBeNull()

    vi.mocked(getAvailableProductById).mockResolvedValue(
      product({ id: 4, url_imagen: null }),
    )
    await expect(getTryOnModelById(4)).resolves.toBeNull()
  })

  it('propaga el error de consulta por id', async () => {
    vi.mocked(getAvailableProductById).mockRejectedValue(
      new Error('No se pudo consultar el producto: boom'),
    )

    await expect(getTryOnModelById(1)).rejects.toThrow(
      'No se pudo consultar el producto: boom',
    )
  })
})

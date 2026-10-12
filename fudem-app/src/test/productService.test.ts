import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../lib/supabase'
import {
  CATALOG_LOAD_ERROR_MESSAGE,
  getAvailableProductById,
  getAvailableProducts,
} from '../services/productService'

type QueryResult = {
  data: unknown
  error: { message: string } | null
}

function mockProductoQuery(result: QueryResult) {
  const maybeSingle = vi.fn().mockResolvedValue(result)
  const eqId = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      returns: vi.fn().mockReturnValue({ maybeSingle }),
    }),
  })
  const eqDisponible = vi.fn().mockReturnValue({
    returns: vi.fn().mockResolvedValue(result),
  })
  const select = vi.fn().mockReturnValue({
    eq: vi.fn((column: string) =>
      column === 'id' ? eqId() : eqDisponible(),
    ),
  })

  vi.mocked(supabase.from).mockReturnValue({ select } as never)
  return { select, maybeSingle }
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const sample = {
  id: 1,
  nombre: 'Montura de prueba',
  precio: 99,
  sku: 'SKU-1',
  material: 'Metal',
  color: 'Negro',
  medidas: '50-20',
  categoria: 'Hombre',
  url_imagen: 'ARNETTEAN7225.webp',
  disponible: true,
}

describe('productService', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
  })

  it('lista solo productos disponibles', async () => {
    mockProductoQuery({ data: [sample], error: null })

    await expect(getAvailableProducts()).resolves.toEqual([sample])
    expect(supabase.from).toHaveBeenCalledWith('producto')
  })

  it('lanza un mensaje controlado si falla la lista del catálogo', async () => {
    mockProductoQuery({ data: null, error: { message: 'JWT expired' } })

    await expect(getAvailableProducts()).rejects.toThrow(
      CATALOG_LOAD_ERROR_MESSAGE,
    )
  })

  it('consulta un producto disponible por id', async () => {
    mockProductoQuery({ data: sample, error: null })

    await expect(getAvailableProductById(1)).resolves.toEqual(sample)
  })

  it('devuelve null cuando el producto no existe', async () => {
    mockProductoQuery({ data: null, error: null })

    await expect(getAvailableProductById(99)).resolves.toBeNull()
  })
})

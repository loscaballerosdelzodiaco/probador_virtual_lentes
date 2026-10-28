import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../lib/supabase'
import { getPedidosEntregados } from '../services/returnService'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

type DbResult = {
  data: unknown
  error: { message: string; code?: string } | null
}

function mockPedidoSelect(result: DbResult) {
  const returns = vi.fn().mockResolvedValue(result)
  const order = vi.fn().mockReturnValue({ returns })
  const eq = vi.fn().mockReturnValue({ order })
  const select = vi.fn().mockReturnValue({ eq })
  vi.mocked(supabase.from).mockReturnValue({ select } as never)
  return { select, eq, order }
}

describe('getPedidosEntregados (T3)', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
  })

  it('consulta solo pedidos "entregado", del más reciente al más antiguo (CA1 / RN1)', async () => {
    const { eq, order } = mockPedidoSelect({ data: [], error: null })

    await getPedidosEntregados()

    expect(supabase.from).toHaveBeenCalledWith('pedido')
    expect(eq).toHaveBeenCalledWith('estado', 'entregado')
    expect(order).toHaveBeenCalledWith('fecha_entrega', { ascending: false })
  })

  it('convierte las filas al modelo de la pantalla', async () => {
    mockPedidoSelect({
      data: [
        {
          id: 7,
          numero_pedido: 'PED-000007',
          monto: '75.50',
          estado: 'entregado',
          fecha_entrega: '2026-10-25T10:00:00Z',
          producto: { nombre: '  Wayfarer Negro ' },
        },
      ],
      error: null,
    })

    await expect(getPedidosEntregados()).resolves.toEqual([
      {
        id: 7,
        numero: 'PED-000007',
        monto: 75.5,
        estado: 'entregado',
        fechaEntrega: '2026-10-25T10:00:00Z',
        productoNombre: 'Wayfarer Negro',
      },
    ])
  })

  it('acepta el producto como arreglo y usa "Lentes" si no se puede leer', async () => {
    mockPedidoSelect({
      data: [
        {
          id: 1,
          numero_pedido: 'PED-000001',
          monto: 10,
          fecha_entrega: '2026-10-25T10:00:00Z',
          producto: [{ nombre: 'Aviador' }],
        },
        {
          id: 2,
          numero_pedido: 'PED-000002',
          monto: 20,
          fecha_entrega: '2026-10-24T10:00:00Z',
          producto: null,
        },
      ],
      error: null,
    })

    const orders = await getPedidosEntregados()

    expect(orders.map((item) => item.productoNombre)).toEqual(['Aviador', 'Lentes'])
  })

  it('devuelve una lista vacía si el cliente no tiene pedidos entregados (A3)', async () => {
    mockPedidoSelect({ data: null, error: null })

    await expect(getPedidosEntregados()).resolves.toEqual([])
  })

  it('lanza un mensaje amigable si Supabase falla', async () => {
    mockPedidoSelect({ data: null, error: { message: 'JWT expired', code: 'PGRST301' } })

    await expect(getPedidosEntregados()).rejects.toThrow(
      'No pudimos cargar tus pedidos entregados. Inténtalo de nuevo en unos momentos.',
    )
  })
})

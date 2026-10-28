import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../lib/supabase'
import { createDevolucion, getPedidosEntregados } from '../services/returnService'

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

function mockDevolucionInsert(result: DbResult | Error) {
  const single =
    result instanceof Error
      ? vi.fn().mockRejectedValue(result)
      : vi.fn().mockResolvedValue(result)
  const select = vi.fn().mockReturnValue({ single })
  const insert = vi.fn().mockReturnValue({ select })
  vi.mocked(supabase.from).mockReturnValue({ insert } as never)
  return { insert }
}

const nueva = {
  pedidoId: 7,
  motivo: 'Llegó dañado' as const,
  forma: 'reembolso' as const,
  comentarios: '  Tiene una raya  ',
}

const filaCreada = {
  id: 11,
  pedido_id: 7,
  motivo: 'Llegó dañado',
  forma: 'reembolso',
  comentarios: 'Tiene una raya',
  estado: 'en revision',
  fecha_solicitud: '2026-10-27T12:00:00Z',
  pedido: { numero_pedido: 'PED-000007', producto: { nombre: 'Aviador' } },
}

describe('createDevolucion (T5)', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
  })

  it('envía solo los campos de la solicitud; estado y usuario los pone la base', async () => {
    const { insert } = mockDevolucionInsert({ data: filaCreada, error: null })

    const created = await createDevolucion(nueva)

    expect(supabase.from).toHaveBeenCalledWith('devolucion')
    expect(insert).toHaveBeenCalledWith({
      pedido_id: 7,
      motivo: 'Llegó dañado',
      forma: 'reembolso',
      comentarios: 'Tiene una raya',
      condiciones_confirmadas: true,
    })
    const enviado = insert.mock.calls[0][0]
    expect(enviado).not.toHaveProperty('estado')
    expect(enviado).not.toHaveProperty('usuario_id')
    expect(created).toMatchObject({ id: 11, estado: 'en revision', numeroPedido: 'PED-000007' })
  })

  it('manda comentarios vacíos como null', async () => {
    const { insert } = mockDevolucionInsert({ data: filaCreada, error: null })

    await createDevolucion({ ...nueva, comentarios: '   ' })

    expect(insert.mock.calls[0][0]).toMatchObject({ comentarios: null })
  })

  it.each([
    ['plazo_vencido (A1)', { message: 'plazo_vencido', code: 'P0001' }, 'Este pedido ya no cumple el plazo de devolución'],
    [
      'índice único 23505 (A2)',
      {
        message: 'duplicate key value violates unique constraint "devolucion_una_activa_por_pedido_idx"',
        code: '23505',
      },
      'Este pedido ya tiene una devolución solicitada',
    ],
    ['pedido_no_entregado (RN1)', { message: 'pedido_no_entregado', code: 'P0001' }, 'Este pedido aún no ha sido entregado'],
    ['pedido_no_encontrado (E1)', { message: 'pedido_no_encontrado', code: 'P0001' }, 'No se pudo registrar la devolución, intenta de nuevo más tarde'],
    [
      'política RLS (E1)',
      { message: 'new row violates row-level security policy for table "devolucion"', code: '42501' },
      'No se pudo registrar la devolución, intenta de nuevo más tarde',
    ],
  ])('traduce %s a un mensaje amigable', async (_caso, error, mensaje) => {
    mockDevolucionInsert({ data: null, error })

    // Mensaje exacto: nunca incluye el texto técnico de la base.
    await expect(createDevolucion(nueva)).rejects.toMatchObject({ message: mensaje })
  })

  it('E1: sin conexión da el mensaje amigable y no el error técnico', async () => {
    mockDevolucionInsert(new TypeError('Failed to fetch'))

    await expect(createDevolucion(nueva)).rejects.toMatchObject({
      message: 'No se pudo registrar la devolución, intenta de nuevo más tarde',
    })
  })

  it('E1: si la base no devuelve la fila creada', async () => {
    mockDevolucionInsert({ data: null, error: null })

    await expect(createDevolucion(nueva)).rejects.toThrow(
      'No se pudo registrar la devolución, intenta de nuevo más tarde',
    )
  })
})

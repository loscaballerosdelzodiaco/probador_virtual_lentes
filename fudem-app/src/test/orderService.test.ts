import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PaymentAlreadyRecordedError } from '../lib/payment/paymentErrors'
import { supabase } from '../lib/supabase'
import {
  PEDIDO_ENTREGA_LOAD_ERROR_MESSAGE,
  createOrder,
  getPedidoConEntrega,
  recordPayment,
} from '../services/orderService'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

type DbResult = {
  data?: unknown
  error: { message: string; code?: string } | null
}

function mockPedidoInsert(result?: DbResult) {
  const single = vi.fn().mockResolvedValue(
    result ?? {
      data: { id: 123, numero_pedido: 'PED-000123', estado: 'pendiente de pago' },
      error: null,
    },
  )
  const select = vi.fn().mockReturnValue({ single })
  const insert = vi.fn().mockReturnValue({ select })
  vi.mocked(supabase.from).mockReturnValue({ insert } as never)
  return { insert, select }
}

function mockPagoInsert(result: DbResult = { error: null }) {
  const insert = vi.fn().mockResolvedValue(result)
  vi.mocked(supabase.from).mockReturnValue({ insert } as never)
  return { insert }
}

describe('createOrder', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
  })

  it('registra el pedido con tarjeta como pendiente de pago y devuelve el número', async () => {
    const { insert } = mockPedidoInsert()

    const order = await createOrder({
      productId: 1,
      formaPago: 'tarjeta',
      documentoId: 44,
    })

    expect(supabase.from).toHaveBeenCalledWith('pedido')
    expect(insert).toHaveBeenCalledWith({
      producto_id: 1,
      forma_pago: 'tarjeta',
      documento_id: 44,
      estado: 'pendiente de pago',
    })
    expect(order).toEqual({
      id: 123,
      numero: 'PED-000123',
      estado: 'pendiente de pago',
    })
  })

  it('registra el pedido en tienda (A1 / RN5)', async () => {
    const { insert } = mockPedidoInsert()

    await createOrder({ productId: 2, formaPago: 'tienda', documentoId: 44 })

    expect(insert).toHaveBeenCalledWith({
      producto_id: 2,
      forma_pago: 'tienda',
      documento_id: 44,
      estado: 'pendiente de pago',
    })
  })

  it('no manda monto ni usuario: los fijan el catálogo y la sesión (RN1)', async () => {
    const { insert } = mockPedidoInsert()

    await createOrder({ productId: 1, formaPago: 'tarjeta', documentoId: 44 })

    const sent = insert.mock.calls[0][0]
    expect(sent).not.toHaveProperty('monto')
    expect(sent).not.toHaveProperty('usuario_id')
    expect(sent).not.toHaveProperty('numero_pedido')
  })

  it('falla si la base de datos rechaza el pedido', async () => {
    mockPedidoInsert({ data: null, error: { message: 'RLS' } })

    await expect(
      createOrder({ productId: 1, formaPago: 'tarjeta', documentoId: 44 }),
    ).rejects.toThrow('No se pudo registrar el pedido.')
  })
})

describe('recordPayment', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
  })

  it('registra un pago aprobado con los últimos 4 dígitos', async () => {
    const { insert } = mockPagoInsert()

    await recordPayment({ pedidoId: 123, estado: 'aprobado', ultimosDigitos: '4242' })

    expect(supabase.from).toHaveBeenCalledWith('pago')
    expect(insert).toHaveBeenCalledWith({
      pedido_id: 123,
      estado: 'aprobado',
      ultimos_digitos: '4242',
    })
  })

  it('registra un pago rechazado (E1)', async () => {
    const { insert } = mockPagoInsert()

    await recordPayment({ pedidoId: 123, estado: 'rechazado', ultimosDigitos: '0002' })

    expect(insert).toHaveBeenCalledWith({
      pedido_id: 123,
      estado: 'rechazado',
      ultimos_digitos: '0002',
    })
  })

  it('no manda el monto: lo copia un trigger desde el pedido', async () => {
    const { insert } = mockPagoInsert()

    await recordPayment({ pedidoId: 123, estado: 'aprobado', ultimosDigitos: '4242' })

    expect(insert.mock.calls[0][0]).not.toHaveProperty('monto')
  })

  it('no guarda más que los últimos 4 dígitos (RN2)', async () => {
    mockPagoInsert()

    await expect(
      recordPayment({
        pedidoId: 123,
        estado: 'aprobado',
        ultimosDigitos: '4242424242424242',
      }),
    ).rejects.toThrow()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('falla si la base de datos rechaza el pago', async () => {
    mockPagoInsert({ error: { message: 'connection lost' } })

    await expect(
      recordPayment({ pedidoId: 123, estado: 'aprobado', ultimosDigitos: '4242' }),
    ).rejects.toThrow('No se pudo registrar el pago.')
  })

  it('avisa que el pedido ya tiene un pago aprobado (CA7)', async () => {
    mockPagoInsert({ error: { message: 'duplicate key', code: '23505' } })

    await expect(
      recordPayment({ pedidoId: 123, estado: 'aprobado', ultimosDigitos: '4242' }),
    ).rejects.toBeInstanceOf(PaymentAlreadyRecordedError)
  })

  it('un pago rechazado duplicado no se toma como pago ya registrado', async () => {
    mockPagoInsert({ error: { message: 'duplicate key', code: '23505' } })

    await expect(
      recordPayment({ pedidoId: 123, estado: 'rechazado', ultimosDigitos: '0002' }),
    ).rejects.toThrow('No se pudo registrar el pago.')
  })
})

describe('getPedidoConEntrega', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
  })

  it('devuelve el pedido con la entrega a domicilio', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 15,
        numero_pedido: 'PED-000015',
        estado: 'pendiente de pago',
        entrega: {
          tipo: 'domicilio',
          direccion: 'Colonia Escalón, casa 123',
          telefono: '70000000',
          departamento: { nombre: 'San Salvador' },
          municipio: { nombre: 'Soyapango' },
          sucursal: null,
        },
      },
      error: null,
    })
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle }),
      }),
    } as never)

    await expect(getPedidoConEntrega(15)).resolves.toEqual({
      id: 15,
      numero: 'PED-000015',
      estado: 'pendiente de pago',
      entrega: {
        tipo: 'domicilio',
        departamento: 'San Salvador',
        municipio: 'Soyapango',
        direccion: 'Colonia Escalón, casa 123',
        telefono: '70000000',
      },
    })
  })

  it('explica si el resumen no se puede leer', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'permission denied' },
          }),
        }),
      }),
    } as never)

    await expect(getPedidoConEntrega(1)).rejects.toThrow(PEDIDO_ENTREGA_LOAD_ERROR_MESSAGE)
  })
})
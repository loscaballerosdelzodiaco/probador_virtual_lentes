import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PaymentAlreadyRecordedError } from '../lib/payment/paymentErrors'
import { supabase } from '../lib/supabase'
import { recordPayment } from '../services/orderService'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

type DbError = { message: string; code?: string }

/** El insert del pago falla y luego se consulta el estado del pedido. */
function mockPagoFailsThenPedido(
  insertError: DbError,
  pedido: { data: unknown; error: DbError | null },
) {
  const insert = vi.fn().mockResolvedValue({ error: insertError })
  const maybeSingle = vi.fn().mockResolvedValue(pedido)
  const eq = vi.fn().mockReturnValue({ maybeSingle })
  const select = vi.fn().mockReturnValue({ eq })

  vi.mocked(supabase.from).mockImplementation(
    (table: string) => (table === 'pago' ? { insert } : { select }) as never,
  )
  return { insert, select, eq }
}

describe('recordPayment: pago aprobado ya registrado (T9, CA7)', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
  })

  it('trata como ya registrado si la política rechaza el pago y el pedido está pagado', async () => {
    const { select, eq } = mockPagoFailsThenPedido(
      { message: 'new row violates row-level security policy', code: '42501' },
      { data: { estado: 'pagado' }, error: null },
    )

    await expect(
      recordPayment({ pedidoId: 123, estado: 'aprobado', ultimosDigitos: '4242' }),
    ).rejects.toBeInstanceOf(PaymentAlreadyRecordedError)
    expect(select).toHaveBeenCalledWith('estado')
    expect(eq).toHaveBeenCalledWith('id', 123)
  })

  it('falla normal si el pedido sigue pendiente de pago', async () => {
    mockPagoFailsThenPedido(
      { message: 'connection lost' },
      { data: { estado: 'pendiente de pago' }, error: null },
    )

    await expect(
      recordPayment({ pedidoId: 123, estado: 'aprobado', ultimosDigitos: '4242' }),
    ).rejects.toThrow('No se pudo registrar el pago.')
  })

  it('falla normal si tampoco se puede consultar el pedido', async () => {
    mockPagoFailsThenPedido(
      { message: 'connection lost' },
      { data: null, error: { message: 'connection lost' } },
    )

    await expect(
      recordPayment({ pedidoId: 123, estado: 'aprobado', ultimosDigitos: '4242' }),
    ).rejects.toThrow('No se pudo registrar el pago.')
  })

  it('no consulta el pedido cuando falla un pago rechazado', async () => {
    const { select } = mockPagoFailsThenPedido(
      { message: 'connection lost' },
      { data: { estado: 'pagado' }, error: null },
    )

    await expect(
      recordPayment({ pedidoId: 123, estado: 'rechazado', ultimosDigitos: '0002' }),
    ).rejects.toThrow('No se pudo registrar el pago.')
    expect(select).not.toHaveBeenCalled()
  })
})

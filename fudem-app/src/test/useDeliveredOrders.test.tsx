import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDeliveredOrders } from '../hooks/useDeliveredOrders'
import { getPedidosEntregados, type PedidoEntregado } from '../services/returnService'

vi.mock('../services/returnService', () => ({
  getPedidosEntregados: vi.fn(),
}))

const pedido: PedidoEntregado = {
  id: 1,
  numero: 'PED-000001',
  monto: 75,
  estado: 'entregado',
  fechaEntrega: '2026-10-25T10:00:00Z',
  productoNombre: 'Wayfarer Negro',
}

describe('useDeliveredOrders', () => {
  beforeEach(() => {
    vi.mocked(getPedidosEntregados).mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('empieza cargando y luego entrega los pedidos', async () => {
    vi.mocked(getPedidosEntregados).mockResolvedValue([pedido])

    const { result } = renderHook(() => useDeliveredOrders())

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.orders).toEqual([pedido])
    expect(result.current.error).toBeNull()
  })

  it('expone un mensaje amigable y no los detalles si la carga falla', async () => {
    vi.mocked(getPedidosEntregados).mockRejectedValue(new Error('JWT expired'))

    const { result } = renderHook(() => useDeliveredOrders())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.orders).toEqual([])
    expect(result.current.error).toBe(
      'No pudimos cargar tus pedidos entregados. Inténtalo de nuevo en unos momentos.',
    )
  })

  it('reload vuelve a consultar y limpia el error', async () => {
    vi.mocked(getPedidosEntregados)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([pedido])

    const { result } = renderHook(() => useDeliveredOrders())
    await waitFor(() => expect(result.current.error).not.toBeNull())

    act(() => result.current.reload())
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.orders).toEqual([pedido])
    expect(getPedidosEntregados).toHaveBeenCalledTimes(2)
  })
})

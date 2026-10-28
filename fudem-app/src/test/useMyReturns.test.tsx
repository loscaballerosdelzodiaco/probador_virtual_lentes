import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMyReturns } from '../hooks/useMyReturns'
import { getMisDevoluciones, type Devolucion } from '../services/returnService'

vi.mock('../services/returnService', () => ({
  getMisDevoluciones: vi.fn(),
}))

const enRevision: Devolucion = {
  id: 1,
  pedidoId: 1,
  numeroPedido: 'PED-000001',
  productoNombre: 'Wayfarer Negro',
  motivo: 'Llegó dañado',
  forma: 'reembolso',
  comentarios: null,
  estado: 'en revision',
  fechaSolicitud: '2026-10-25T10:00:00Z',
}

describe('useMyReturns', () => {
  beforeEach(() => {
    vi.mocked(getMisDevoluciones).mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('empieza cargando y luego entrega las solicitudes', async () => {
    vi.mocked(getMisDevoluciones).mockResolvedValue([enRevision])

    const { result } = renderHook(() => useMyReturns())

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.returns).toEqual([enRevision])
    expect(result.current.error).toBeNull()
  })

  it('si la primera carga falla expone un mensaje amigable y "reload" reintenta', async () => {
    vi.mocked(getMisDevoluciones)
      .mockRejectedValueOnce(new Error('JWT expired'))
      .mockResolvedValueOnce([enRevision])

    const { result } = renderHook(() => useMyReturns())
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toBe(
      'No pudimos cargar tus devoluciones. Inténtalo de nuevo en unos momentos.',
    )

    act(() => result.current.reload())
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.returns).toEqual([enRevision])
  })

  it('"reload" con datos actualiza sin volver a "loading" y trae el nuevo estado', async () => {
    vi.mocked(getMisDevoluciones)
      .mockResolvedValueOnce([enRevision])
      .mockResolvedValueOnce([{ ...enRevision, estado: 'aprobada' }])

    const { result } = renderHook(() => useMyReturns())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.reload())
    expect(result.current.loading).toBe(false)
    expect(result.current.refreshing).toBe(true)

    await waitFor(() => expect(result.current.refreshing).toBe(false))
    expect(result.current.returns[0].estado).toBe('aprobada')
  })

  it('si falla una actualización conserva la lista anterior y avisa aparte', async () => {
    vi.mocked(getMisDevoluciones)
      .mockResolvedValueOnce([enRevision])
      .mockRejectedValueOnce(new Error('network'))

    const { result } = renderHook(() => useMyReturns())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.reload())
    await waitFor(() => expect(result.current.refreshing).toBe(false))

    expect(result.current.returns).toEqual([enRevision])
    expect(result.current.error).toBeNull()
    expect(result.current.refreshError).toBe(
      'No pudimos cargar tus devoluciones. Inténtalo de nuevo en unos momentos.',
    )
  })

  it('addReturn agrega la solicitud nueva al inicio sin consultar de nuevo', async () => {
    vi.mocked(getMisDevoluciones).mockResolvedValue([enRevision])

    const { result } = renderHook(() => useMyReturns())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const nueva = { ...enRevision, id: 2, pedidoId: 2, numeroPedido: 'PED-000002' }
    act(() => result.current.addReturn(nueva))

    expect(result.current.returns.map((item) => item.id)).toEqual([2, 1])
    expect(getMisDevoluciones).toHaveBeenCalledTimes(1)
  })
})

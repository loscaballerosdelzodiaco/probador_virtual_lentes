import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDeliveryCatalogs } from '../hooks/useDeliveryCatalogs'
import {
  CATALOGOS_ENTREGA_LOAD_ERROR_MESSAGE,
  getDepartamentos,
  getMunicipios,
  getSucursalesActivas,
} from '../services/deliveryCatalogService'

vi.mock('../services/deliveryCatalogService', async () => {
  const actual = await vi.importActual<
    typeof import('../services/deliveryCatalogService')
  >('../services/deliveryCatalogService')
  return {
    ...actual,
    getDepartamentos: vi.fn(),
    getMunicipios: vi.fn(),
    getSucursalesActivas: vi.fn(),
  }
})

describe('useDeliveryCatalogs', () => {
  beforeEach(() => {
    vi.mocked(getDepartamentos).mockReset()
    vi.mocked(getMunicipios).mockReset()
    vi.mocked(getSucursalesActivas).mockReset()
    vi.mocked(getDepartamentos).mockResolvedValue([
      { id: 'san-salvador', nombre: 'San Salvador' },
    ])
    vi.mocked(getMunicipios).mockResolvedValue([
      {
        id: 'san-salvador-centro',
        departamentoId: 'san-salvador',
        nombre: 'San Salvador Centro',
      },
    ])
    vi.mocked(getSucursalesActivas).mockResolvedValue([
      { id: '1', nombre: 'FUDEM San Salvador', activa: true },
    ])
  })

  it('expone catálogos cuando la carga termina', async () => {
    const { result } = renderHook(() => useDeliveryCatalogs())
    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.departamentos).toHaveLength(1)
    expect(result.current.municipios[0]?.nombre).toBe('San Salvador Centro')
    expect(result.current.sucursales).toEqual([
      { id: '1', nombre: 'FUDEM San Salvador', activa: true },
    ])
  })

  it('deja sucursales vacías de forma controlada y reporta el error de red', async () => {
    vi.mocked(getSucursalesActivas).mockRejectedValue(
      new Error(CATALOGOS_ENTREGA_LOAD_ERROR_MESSAGE),
    )
    const { result } = renderHook(() => useDeliveryCatalogs())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(CATALOGOS_ENTREGA_LOAD_ERROR_MESSAGE)
    expect(result.current.sucursales).toEqual([])
    expect(result.current.departamentos).toEqual([])
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../lib/supabase'
import {
  SUCURSAL_TABLE,
  SUCURSALES_LOAD_ERROR_MESSAGE,
  filtrarSucursalesActivas,
  getDepartamentos,
  getMunicipios,
  getSucursalesActivas,
  type SucursalRegistro,
} from '../services/deliveryCatalogService'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const activas: SucursalRegistro[] = [
  { id: 1, nombre: 'FUDEM San Salvador', activa: true },
  { id: 3, nombre: 'FUDEM San Miguel', activa: true },
]

function mockSucursalesQuery(result: {
  data: SucursalRegistro[] | null
  error: { message: string } | null
}) {
  const order = vi.fn().mockReturnValue({
    returns: vi.fn().mockResolvedValue(result),
  })
  const eq = vi.fn().mockReturnValue({ order })
  const select = vi.fn().mockReturnValue({ eq })
  vi.mocked(supabase.from).mockReturnValue({ select } as never)
  return { select, eq, order }
}

describe('deliveryCatalogService', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
  })

  it('lista los 14 departamentos de El Salvador', async () => {
    const departamentos = await getDepartamentos()
    expect(departamentos).toHaveLength(14)
    expect(departamentos.map((item) => item.nombre)).toEqual([
      'Ahuachapán',
      'Santa Ana',
      'Sonsonate',
      'Chalatenango',
      'La Libertad',
      'San Salvador',
      'Cuscatlán',
      'La Paz',
      'Cabañas',
      'San Vicente',
      'Usulután',
      'San Miguel',
      'Morazán',
      'La Unión',
    ])
  })

  it('filtra municipios según el departamento elegido', async () => {
    const deSanSalvador = await getMunicipios('san-salvador')
    expect(deSanSalvador.every((item) => item.departamentoId === 'san-salvador')).toBe(
      true,
    )
    expect(deSanSalvador.map((item) => item.nombre)).toEqual([
      'San Salvador Norte',
      'San Salvador Oeste',
      'San Salvador Este',
      'San Salvador Centro',
      'San Salvador Sur',
    ])

    const deMorazan = await getMunicipios('morazan')
    expect(deMorazan).toHaveLength(2)
    expect(deMorazan.some((item) => item.departamentoId === 'san-salvador')).toBe(false)
  })

  it('excluye sucursales inactivas', () => {
    const mixtas: SucursalRegistro[] = [
      { id: 1, nombre: 'FUDEM San Salvador', activa: true },
      { id: 2, nombre: 'FUDEM Soyapango (cerrada)', activa: false },
      { id: 3, nombre: 'FUDEM San Miguel', activa: true },
    ]

    expect(filtrarSucursalesActivas(mixtas)).toEqual([
      { id: '1', nombre: 'FUDEM San Salvador', activa: true },
      { id: '3', nombre: 'FUDEM San Miguel', activa: true },
    ])
  })

  it('consulta solo sucursales activas y devuelve [] si no hay', async () => {
    const { eq } = mockSucursalesQuery({ data: activas, error: null })

    await expect(getSucursalesActivas()).resolves.toEqual([
      { id: '1', nombre: 'FUDEM San Salvador', activa: true },
      { id: '3', nombre: 'FUDEM San Miguel', activa: true },
    ])
    expect(supabase.from).toHaveBeenCalledWith(SUCURSAL_TABLE)
    expect(eq).toHaveBeenCalledWith('activa', true)

    mockSucursalesQuery({ data: [], error: null })
    await expect(getSucursalesActivas()).resolves.toEqual([])
  })

  it('lanza un mensaje controlado si falla la carga de sucursales', async () => {
    mockSucursalesQuery({ data: null, error: { message: 'JWT expired' } })
    await expect(getSucursalesActivas()).rejects.toThrow(SUCURSALES_LOAD_ERROR_MESSAGE)
  })
})

import catalogo from '../data/el-salvador.json'
import type {
  DepartamentoOption,
  MunicipioOption,
  SucursalOption,
} from '../lib/delivery/types'
import { supabase } from '../lib/supabase'

export const SUCURSAL_TABLE = 'sucursal'

export const SUCURSALES_LOAD_ERROR_MESSAGE =
  'No pudimos cargar las sucursales. Inténtalo de nuevo en unos momentos.'

export const CATALOGOS_ENTREGA_LOAD_ERROR_MESSAGE =
  'No pudimos cargar las opciones de entrega. Inténtalo de nuevo en unos momentos.'

export type SucursalRegistro = {
  id: number
  nombre: string
  activa: boolean
}

const departamentos: DepartamentoOption[] = catalogo.departamentos
const municipios: MunicipioOption[] = catalogo.municipios

/** 14 departamentos de El Salvador. */
export async function getDepartamentos(): Promise<DepartamentoOption[]> {
  return departamentos
}

/**
 * Municipios del departamento. Sin id (o id vacío) no filtra:
 * el hook puede cargar el catálogo completo de una vez.
 */
export async function getMunicipios(
  departamentoId?: string,
): Promise<MunicipioOption[]> {
  const id = departamentoId?.trim() ?? ''
  if (!id) return municipios
  return municipios.filter((municipio) => municipio.departamentoId === id)
}

export function filtrarSucursalesActivas(
  sucursales: SucursalRegistro[],
): SucursalOption[] {
  return sucursales
    .filter((sucursal) => sucursal.activa === true)
    .map((sucursal) => ({
      id: String(sucursal.id),
      nombre: sucursal.nombre,
      activa: true,
    }))
}

/**
 * Solo sucursales activas. Si no hay ninguna, devuelve []
 * para que la UI muestre el aviso de retiro no disponible.
 */
export async function getSucursalesActivas(): Promise<SucursalOption[]> {
  const { data, error } = await supabase
    .from(SUCURSAL_TABLE)
    .select('id, nombre, activa')
    .eq('activa', true)
    .order('nombre', { ascending: true })
    .returns<SucursalRegistro[]>()

  if (error) {
    throw new Error(SUCURSALES_LOAD_ERROR_MESSAGE, { cause: error })
  }

  return filtrarSucursalesActivas(data ?? [])
}

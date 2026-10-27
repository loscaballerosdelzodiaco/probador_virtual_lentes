import { useEffect, useState } from 'react'
import type {
  DepartamentoOption,
  MunicipioOption,
  SucursalOption,
} from '../lib/delivery/types'
import {
  CATALOGOS_ENTREGA_LOAD_ERROR_MESSAGE,
  getDepartamentos,
  getMunicipios,
  getSucursalesActivas,
} from '../services/deliveryCatalogService'

export type DeliveryCatalogs = {
  departamentos: DepartamentoOption[]
  municipios: MunicipioOption[]
  sucursales: SucursalOption[]
  loading: boolean
  error: string | null
}

const EMPTY: Omit<DeliveryCatalogs, 'loading' | 'error'> = {
  departamentos: [],
  municipios: [],
  sucursales: [],
}

/**
 * Catálogos de forma de entrega (HU6). La pantalla solo consume este hook.
 *
 * Municipio dependiente del departamento:
 *
 * ```tsx
 * const { departamentos, municipios, sucursales, loading, error } = useDeliveryCatalogs()
 * const [departamentoId, setDepartamentoId] = useState('')
 * const municipiosDelDepto = municipios.filter((item) => item.departamentoId === departamentoId)
 *
 * <select value={departamentoId} onChange={(e) => setDepartamentoId(e.target.value)}>
 *   {departamentos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
 * </select>
 * <select value={municipioId} disabled={!departamentoId}>
 *   {municipiosDelDepto.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
 * </select>
 * ```
 *
 * `sucursales` llega ya filtrada (activas). Si viene [], mostrar
 * "No hay sucursales disponibles para retiro".
 */
export function useDeliveryCatalogs(): DeliveryCatalogs {
  const [catalogs, setCatalogs] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    Promise.all([getDepartamentos(), getMunicipios(), getSucursalesActivas()])
      .then(([nextDepartamentos, nextMunicipios, nextSucursales]) => {
        if (!active) return
        setCatalogs({
          departamentos: nextDepartamentos,
          municipios: nextMunicipios,
          sucursales: nextSucursales,
        })
        setError(null)
      })
      .catch((cause: unknown) => {
        if (!active) return
        console.error(cause)
        setCatalogs(EMPTY)
        setError(
          cause instanceof Error && cause.message
            ? cause.message
            : CATALOGOS_ENTREGA_LOAD_ERROR_MESSAGE,
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return { ...catalogs, loading, error }
}

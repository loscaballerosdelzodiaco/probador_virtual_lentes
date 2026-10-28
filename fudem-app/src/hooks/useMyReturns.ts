import { useCallback, useEffect, useRef, useState } from 'react'
import { RETURNS_LOAD_ERROR_MESSAGE } from '../lib/returns/returnRules'
import { getMisDevoluciones, type Devolucion } from '../services/returnService'

export type MyReturns = {
  returns: Devolucion[]
  /** Primera carga (o reintento tras un error): todavía no hay datos que mostrar. */
  loading: boolean
  /** Hay datos y se están actualizando: la lista sigue visible. */
  refreshing: boolean
  /** La primera carga falló: no hay datos que mostrar. */
  error: string | null
  /** Una actualización falló: se conserva la lista anterior. */
  refreshError: string | null
  /** Vuelve a consultar el estado de las solicitudes. */
  reload: () => void
  /** Agrega una solicitud recién creada sin volver a consultar. */
  addReturn: (created: Devolucion) => void
}

/**
 * Solicitudes de devolución del cliente y su estado (HU7 / T6 / CA5).
 * Las usa la pantalla para listarlas y para validar A2 (pedido con devolución activa).
 */
export function useMyReturns(): MyReturns {
  const [returns, setReturns] = useState<Devolucion[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const loadedRef = useRef(false)

  useEffect(() => {
    let active = true

    getMisDevoluciones()
      .then((rows) => {
        if (!active) return
        loadedRef.current = true
        setReturns(rows)
        setError(null)
        setRefreshError(null)
      })
      .catch((cause: unknown) => {
        if (!active) return
        console.error(cause)
        if (loadedRef.current) {
          setRefreshError(RETURNS_LOAD_ERROR_MESSAGE)
        } else {
          setError(RETURNS_LOAD_ERROR_MESSAGE)
        }
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
        setRefreshing(false)
      })

    return () => {
      active = false
    }
  }, [attempt])

  const reload = useCallback(() => {
    if (loadedRef.current) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setRefreshError(null)
    setAttempt((value) => value + 1)
  }, [])

  const addReturn = useCallback((created: Devolucion) => {
    setReturns((current) => [created, ...current])
  }, [])

  return { returns, loading, refreshing, error, refreshError, reload, addReturn }
}

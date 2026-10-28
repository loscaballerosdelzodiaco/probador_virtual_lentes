import { useCallback, useEffect, useState } from 'react'
import { DELIVERED_ORDERS_LOAD_ERROR_MESSAGE } from '../lib/returns/returnRules'
import { getPedidosEntregados, type PedidoEntregado } from '../services/returnService'

export type DeliveredOrders = {
  orders: PedidoEntregado[]
  loading: boolean
  /** Mensaje listo para mostrar; null si la carga salió bien. */
  error: string | null
  /** Vuelve a pedir los pedidos (por ejemplo, desde un botón "Reintentar"). */
  reload: () => void
}

/**
 * Pedidos entregados del cliente (HU7 / T3). La pantalla de devoluciones solo
 * consume este hook:
 *
 * ```tsx
 * const { orders, loading, error, reload } = useDeliveredOrders()
 * if (loading) return <p role="status">Cargando tus pedidos…</p>
 * if (error) return <p role="alert">{error}</p>
 * if (orders.length === 0) return <p>No tienes pedidos disponibles para devolución</p>
 * ```
 */
export function useDeliveredOrders(): DeliveredOrders {
  const [orders, setOrders] = useState<PedidoEntregado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true

    getPedidosEntregados()
      .then((rows) => {
        if (!active) return
        setOrders(rows)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (!active) return
        console.error(cause)
        setOrders([])
        setError(DELIVERED_ORDERS_LOAD_ERROR_MESSAGE)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [attempt])

  const reload = useCallback(() => {
    setLoading(true)
    setAttempt((value) => value + 1)
  }, [])

  return { orders, loading, error, reload }
}

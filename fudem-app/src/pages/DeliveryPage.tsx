import { useEffect, useState } from 'react'
import { useDeliveryCatalogs } from '../hooks/useDeliveryCatalogs'
import { replaceLocation } from '../lib/appRoute'
import type {
  DeliverySelection,
  DepartamentoOption,
  MunicipioOption,
} from '../lib/delivery/types'
import { DELIVERY_SAVE_ERROR_MESSAGE } from '../lib/delivery/validateDelivery'
import type { PedidoConEntrega } from '../lib/payment/orderStatus'
import { registrarEntrega } from '../services/deliveryService'
import { supabase } from '../lib/supabase'
import {
  PEDIDO_ENTREGA_LOAD_ERROR_MESSAGE,
  getPedidoConEntrega,
  getUltimoPedidoConEntrega,
} from '../services/orderService'
import { DeliveryOptionsPage } from './DeliveryOptionsPage'

export type DeliveryPageProps = {
  pedidoId: number | null
}

function idNumerico(value: string): number | null {
  if (/^[1-9]\d*$/.test(value)) return Number(value)
  return null
}

async function selectionToInput(
  selection: DeliverySelection,
  departamentos: DepartamentoOption[],
  municipios: MunicipioOption[],
) {
  if (selection.method === 'sucursal') {
    return {
      tipo: 'sucursal' as const,
      sucursalId: selection.sucursalId,
    }
  }

  const departamentoId =
    idNumerico(selection.departamentoId) ??
    (await idPorNombre(
      'departamento',
      departamentos.find((item) => item.id === selection.departamentoId)?.nombre,
    ))
  const municipioId =
    idNumerico(selection.municipioId) ??
    (await idMunicipio(
      departamentoId,
      municipios.find((item) => item.id === selection.municipioId)?.nombre,
    ))

  if (departamentoId == null || municipioId == null) {
    throw new Error(DELIVERY_SAVE_ERROR_MESSAGE)
  }

  return {
    tipo: 'domicilio' as const,
    departamentoId,
    municipioId,
    direccion: selection.direccion,
    telefono: selection.telefono,
  }
}

async function idPorNombre(tabla: 'departamento', nombre: string | undefined) {
  if (!nombre) return null
  const { data, error } = await supabase
    .from(tabla)
    .select('id')
    .eq('nombre', nombre)
    .maybeSingle<{ id: number }>()
  if (error || !data) return null
  return data.id
}

async function idMunicipio(departamentoId: number | null, nombre: string | undefined) {
  if (departamentoId == null || !nombre) return null
  const { data, error } = await supabase
    .from('municipio')
    .select('id')
    .eq('departamento_id', departamentoId)
    .eq('nombre', nombre)
    .maybeSingle<{ id: number }>()
  if (error || !data) return null
  return data.id
}

export function DeliveryPage({ pedidoId }: DeliveryPageProps) {
  const catalogs = useDeliveryCatalogs()
  const [pedido, setPedido] = useState<PedidoConEntrega | null>(null)
  const [pedidoLoading, setPedidoLoading] = useState(true)
  const [pedidoError, setPedidoError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setPedidoLoading(true)
    setPedidoError(null)

    const load =
      pedidoId != null ? getPedidoConEntrega(pedidoId) : getUltimoPedidoConEntrega()

    load
      .then((row) => {
        if (!active) return
        setPedido(row)
        setPedidoError(null)
      })
      .catch((cause: unknown) => {
        if (!active) return
        console.error(cause)
        setPedido(null)
        setPedidoError(
          cause instanceof Error && cause.message
            ? cause.message
            : PEDIDO_ENTREGA_LOAD_ERROR_MESSAGE,
        )
      })
      .finally(() => {
        if (active) setPedidoLoading(false)
      })

    return () => {
      active = false
    }
  }, [pedidoId])

  async function handleConfirm(selection: DeliverySelection) {
    const id = pedido?.id
    if (id == null) {
      throw new Error(DELIVERY_SAVE_ERROR_MESSAGE)
    }
    await registrarEntrega(
      id,
      await selectionToInput(selection, catalogs.departamentos, catalogs.municipios),
    )
    const refreshed = await getPedidoConEntrega(id)
    if (!refreshed?.entrega) {
      throw new Error(PEDIDO_ENTREGA_LOAD_ERROR_MESSAGE)
    }
    setPedido(refreshed)
    if (pedidoId == null) replaceLocation(`/entrega#${refreshed.id}`)
  }

  if (catalogs.loading || pedidoLoading) {
    return (
      <section className="section">
        <div className="container prose">
          <p role="status">Cargando opciones de entrega…</p>
        </div>
      </section>
    )
  }

  if (catalogs.error) {
    return (
      <section className="section">
        <div className="container prose">
          <p className="notice notice--error" role="alert">
            {catalogs.error}
          </p>
        </div>
      </section>
    )
  }

  return (
    <DeliveryOptionsPage
      departamentos={catalogs.departamentos}
      municipios={catalogs.municipios}
      sucursales={catalogs.sucursales}
      savedEntrega={pedido?.entrega ?? null}
      pedidoNumero={pedido?.numero ?? null}
      summaryError={pedidoError}
      onConfirm={handleConfirm}
    />
  )
}

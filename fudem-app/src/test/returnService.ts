import { supabase } from '../lib/supabase'
import { ESTADO_PEDIDO } from '../lib/payment/orderStatus'
import {
  DELIVERED_ORDERS_LOAD_ERROR_MESSAGE,
  MSG_ALREADY_REQUESTED,
  MSG_OUT_OF_WINDOW,
  MSG_SAVE_ERROR,
  RETURNS_LOAD_ERROR_MESSAGE,
  type EstadoDevolucion,
  type FormaDevolucion,
  type ReturnReason,
} from '../lib/returns/returnRules'

const PEDIDO_TABLE = 'pedido'
const DEVOLUCION_TABLE = 'devolucion'
const UNIQUE_VIOLATION_CODE = '23505'

export type PedidoEntregado = {
  id: number
  numero: string
  monto: number
  fechaEntrega: string | null
  productoNombre: string
}

export type Devolucion = {
  id: number
  pedidoId: number
  numeroPedido: string
  productoNombre: string
  motivo: string
  forma: FormaDevolucion
  comentarios: string | null
  estado: EstadoDevolucion
  fechaSolicitud: string
}

export type NuevaDevolucion = {
  pedidoId: number
  motivo: ReturnReason
  forma: FormaDevolucion
  comentarios: string
}

type ProductoJoin = { nombre: string | null }

type PedidoRow = {
  id: number
  numero_pedido: string
  monto: number
  fecha_entrega: string | null
  producto: ProductoJoin | ProductoJoin[] | null
}

type DevolucionRow = {
  id: number
  pedido_id: number
  motivo: string
  forma: FormaDevolucion
  comentarios: string | null
  estado: EstadoDevolucion
  fecha_solicitud: string
  pedido:
    | { numero_pedido: string; producto: ProductoJoin | ProductoJoin[] | null }
    | { numero_pedido: string; producto: ProductoJoin | ProductoJoin[] | null }[]
    | null
}

const PEDIDO_SELECT = `
  id,
  numero_pedido,
  monto,
  fecha_entrega,
  producto:producto_id ( nombre )
`

const DEVOLUCION_SELECT = `
  id,
  pedido_id,
  motivo,
  forma,
  comentarios,
  estado,
  fecha_solicitud,
  pedido:pedido_id (
    numero_pedido,
    producto:producto_id ( nombre )
  )
`

function first<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function nombreProducto(value: ProductoJoin | ProductoJoin[] | null): string {
  return first(value)?.nombre?.trim() || 'Lentes'
}

function pedidoDesdeFila(row: PedidoRow): PedidoEntregado {
  return {
    id: row.id,
    numero: row.numero_pedido,
    monto: Number(row.monto),
    fechaEntrega: row.fecha_entrega,
    productoNombre: nombreProducto(row.producto),
  }
}

function devolucionDesdeFila(row: DevolucionRow): Devolucion {
  const pedido = first(row.pedido)
  return {
    id: row.id,
    pedidoId: row.pedido_id,
    numeroPedido: pedido?.numero_pedido ?? `#${row.pedido_id}`,
    productoNombre: nombreProducto(pedido?.producto ?? null),
    motivo: row.motivo,
    forma: row.forma,
    comentarios: row.comentarios,
    estado: row.estado,
    fechaSolicitud: row.fecha_solicitud,
  }
}

/**
 * T3 / CA1 / RN1: pedidos "entregado" del cliente, el más reciente primero.
 *
 * No filtra por usuario en la consulta: la política RLS "el cliente consulta
 * sus pedidos" ya limita la tabla a los pedidos de la sesión (igual que
 * orderService). Los pedidos sin fecha de entrega no existen por el constraint
 * pedido_entregado_fecha_check, pero se descartan por si acaso.
 */
export async function getPedidosEntregados(): Promise<PedidoEntregado[]> {
  const { data, error } = await supabase
    .from(PEDIDO_TABLE)
    .select(PEDIDO_SELECT)
    .eq('estado', ESTADO_PEDIDO.entregado)
    .order('fecha_entrega', { ascending: false })
    .returns<PedidoRow[]>()

  if (error) {
    throw new Error(DELIVERED_ORDERS_LOAD_ERROR_MESSAGE, { cause: error })
  }
  return (data ?? []).map(pedidoDesdeFila)
}

/** CA5: solicitudes de devolución del cliente. */
export async function getMisDevoluciones(): Promise<Devolucion[]> {
  const { data, error } = await supabase
    .from(DEVOLUCION_TABLE)
    .select(DEVOLUCION_SELECT)
    .order('fecha_solicitud', { ascending: false })
    .returns<DevolucionRow[]>()

  if (error) {
    throw new Error(RETURNS_LOAD_ERROR_MESSAGE, { cause: error })
  }
  return (data ?? []).map(devolucionDesdeFila)
}

type SupabaseErrorLike = { code?: string; message?: string }

function mensajeDeError(error: SupabaseErrorLike): string {
  // RN4: índice único, ya hay una devolución activa para el pedido.
  if (error.code === UNIQUE_VIOLATION_CODE) return MSG_ALREADY_REQUESTED
  // RN2: el trigger de la base de datos rechazó el plazo.
  if (error.message?.includes('plazo_vencido')) return MSG_OUT_OF_WINDOW
  return MSG_SAVE_ERROR
}

/**
 * CA4 / CA6: registra la solicitud. En caso de error lanza un Error con el
 * mensaje listo para mostrar al cliente.
 */
export async function createDevolucion(input: NuevaDevolucion): Promise<Devolucion> {
  const { data, error } = await supabase
    .from(DEVOLUCION_TABLE)
    .insert({
      pedido_id: input.pedidoId,
      motivo: input.motivo,
      forma: input.forma,
      comentarios: input.comentarios.trim() || null,
      condiciones_confirmadas: true,
    })
    .select(DEVOLUCION_SELECT)
    .single<DevolucionRow>()

  if (error || !data) {
    throw new Error(error ? mensajeDeError(error) : MSG_SAVE_ERROR, { cause: error })
  }

  return devolucionDesdeFila(data)
}

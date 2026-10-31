import { supabase } from '../lib/supabase'
import {
  ESTADO_PEDIDO,
  type EntregaPedido,
  type EstadoPago,
  type EstadoPedido,
  type FormaPagoPedido,
  type PedidoConEntrega,
  type PedidoRegistrado,
} from '../lib/payment/orderStatus'
import {
  PaymentAlreadyRecordedError,
  UNIQUE_VIOLATION_CODE,
} from '../lib/payment/paymentErrors'

const PEDIDO_TABLE = 'pedido'
const PAGO_TABLE = 'pago'

export const PEDIDO_ENTREGA_LOAD_ERROR_MESSAGE =
  'No pudimos cargar el resumen de entrega. Inténtalo de nuevo en unos momentos.'

const PEDIDO_ENTREGA_SELECT = `
  id,
  numero_pedido,
  estado,
  entrega (
    tipo,
    direccion,
    telefono,
    departamento:departamento_id ( nombre ),
    municipio:municipio_id ( nombre ),
    sucursal:sucursal_id ( nombre, direccion )
  )
`

type EntregaJoinRow = {
  tipo: 'domicilio' | 'sucursal'
  direccion: string | null
  telefono: string | null
  departamento: { nombre: string } | null
  municipio: { nombre: string } | null
  sucursal: { nombre: string; direccion: string | null } | null
}

type PedidoJoinRow = {
  id: number
  numero_pedido: string
  estado: EstadoPedido
  entrega: EntregaJoinRow | EntregaJoinRow[] | null
}

type PedidoRow = {
  id: number
  numero_pedido: string
  estado: EstadoPedido
}

export type NuevoPedido = {
  productId: number
  formaPago: FormaPagoPedido
  documentoId: number
}

export type NuevoPago = {
  pedidoId: number
  estado: EstadoPago
  /** RN2: solo los últimos 4 dígitos; nunca el número completo ni el CVV. */
  ultimosDigitos: string
}

/**
 * Crea el pedido como "pendiente de pago" (la política RLS no permite otro estado).
 * El monto sale del catálogo (RN1) y el número lo asigna la base de datos.
 */
export async function createOrder(input: NuevoPedido): Promise<PedidoRegistrado> {
  const { data, error } = await supabase
    .from(PEDIDO_TABLE)
    .insert({
      producto_id: input.productId,
      forma_pago: input.formaPago,
      documento_id: input.documentoId,
      estado: ESTADO_PEDIDO.pendiente,
    })
    .select('id, numero_pedido, estado')
    .single<PedidoRow>()

  if (error || !data) {
    throw new Error('No se pudo registrar el pedido.', { cause: error })
  }

  return { id: data.id, numero: data.numero_pedido, estado: data.estado }
}

/**
 * Registra un intento de pago con tarjeta. Si es aprobado, un trigger pasa el
 * pedido a "pagado" (RN3); el cliente no puede actualizar pedidos.
 *
 * CA7: un pedido solo admite un pago aprobado. Si la base de datos ya tiene
 * uno, lanza PaymentAlreadyRecordedError para que la pantalla muestre la
 * confirmación en lugar de un error.
 */
export async function recordPayment(input: NuevoPago): Promise<void> {
  if (!/^\d{4}$/.test(input.ultimosDigitos)) {
    throw new Error('Solo se pueden guardar los últimos 4 dígitos de la tarjeta.')
  }

  const { error } = await supabase.from(PAGO_TABLE).insert({
    pedido_id: input.pedidoId,
    estado: input.estado,
    ultimos_digitos: input.ultimosDigitos,
  })

  if (error) {
    if (
      input.estado === 'aprobado' &&
      (error.code === UNIQUE_VIOLATION_CODE || (await isOrderPaid(input.pedidoId)))
    ) {
      throw new PaymentAlreadyRecordedError()
    }
    throw new Error('No se pudo registrar el pago.', { cause: error })
  }
}

/**
 * T9: si el pedido ya quedó pagado, la política RLS rechaza el nuevo pago
 * antes que el índice único. Se consulta el pedido para no mostrar un error
 * cuando el pago ya se había guardado (por ejemplo, si se perdió la respuesta).
 */
async function isOrderPaid(pedidoId: number): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(PEDIDO_TABLE)
      .select('estado')
      .eq('id', pedidoId)
      .maybeSingle<{ estado: EstadoPedido }>()

    return !error && data?.estado === ESTADO_PEDIDO.pagado
  } catch {
    return false
  }
}

function firstEntrega(value: PedidoJoinRow['entrega']): EntregaJoinRow | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function entregaDesdeFila(row: EntregaJoinRow | null): EntregaPedido | null {
  if (!row) return null
  if (row.tipo === 'domicilio') {
    return {
      tipo: 'domicilio',
      departamento: row.departamento?.nombre?.trim() || '—',
      municipio: row.municipio?.nombre?.trim() || '—',
      direccion: row.direccion?.trim() || '—',
      telefono: row.telefono?.trim() || '—',
    }
  }
  return {
    tipo: 'sucursal',
    sucursalNombre: row.sucursal?.nombre?.trim() || '—',
    sucursalDireccion: row.sucursal?.direccion?.trim() || '—',
  }
}

function pedidoDesdeFila(row: PedidoJoinRow): PedidoConEntrega {
  return {
    id: row.id,
    numero: row.numero_pedido,
    estado: row.estado,
    entrega: entregaDesdeFila(firstEntrega(row.entrega)),
  }
}

/** Pedido del cliente con su entrega, o null si no existe / no es suyo. */
export async function getPedidoConEntrega(
  pedidoId: number,
): Promise<PedidoConEntrega | null> {
  const { data, error } = await supabase
    .from(PEDIDO_TABLE)
    .select(PEDIDO_ENTREGA_SELECT)
    .eq('id', pedidoId)
    .maybeSingle<PedidoJoinRow>()

  if (error) {
    throw new Error(PEDIDO_ENTREGA_LOAD_ERROR_MESSAGE, { cause: error })
  }
  return data ? pedidoDesdeFila(data) : null
}

/** Último pedido de la sesión, para recargar /entrega sin hash. */
export async function getUltimoPedidoConEntrega(): Promise<PedidoConEntrega | null> {
  const { data, error } = await supabase
    .from(PEDIDO_TABLE)
    .select(PEDIDO_ENTREGA_SELECT)
    .order('fecha_pedido', { ascending: false })
    .limit(1)
    .maybeSingle<PedidoJoinRow>()

  if (error) {
    throw new Error(PEDIDO_ENTREGA_LOAD_ERROR_MESSAGE, { cause: error })
  }
  return data ? pedidoDesdeFila(data) : null
}
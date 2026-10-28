// Reglas de negocio de devoluciones (HU7).
// Lo configurable vive aquí para cambiarlo en un solo lugar.

import { ESTADO_PEDIDO, type EstadoPedido } from '../payment/orderStatus'
import { RETURN_MESSAGES } from './messages'

/** RN2: días posteriores a la entrega para solicitar la devolución. */
export const RETURN_WINDOW_DAYS = 8

/** RN3 */
export const RETURN_CONDITIONS_TEXT =
  'Los lentes deben devolverse sin uso y en su empaque original.'

export const RETURN_REASONS = [
  'Defecto de fábrica',
  'No me queda bien',
  'No me gusta el diseño',
  'Producto distinto al pedido',
  'Llegó dañado',
  'Otro',
] as const

export type ReturnReason = (typeof RETURN_REASONS)[number]

/** Valores tal como los guarda la migración de devolucion. */
export const FORMA_DEVOLUCION = {
  reembolso: 'reembolso',
  cambio: 'cambio',
} as const

export type FormaDevolucion = (typeof FORMA_DEVOLUCION)[keyof typeof FORMA_DEVOLUCION]

export const FORMA_DEVOLUCION_LABEL: Record<FormaDevolucion, string> = {
  reembolso: 'Reembolso',
  cambio: 'Cambio por otro lente',
}

export const ESTADO_DEVOLUCION = {
  enRevision: 'en revision',
  aprobada: 'aprobada',
  rechazada: 'rechazada',
  completada: 'completada',
} as const

export type EstadoDevolucion =
  (typeof ESTADO_DEVOLUCION)[keyof typeof ESTADO_DEVOLUCION]

/** Texto que ve el cliente. */
export const ESTADO_DEVOLUCION_LABEL: Record<EstadoDevolucion, string> = {
  'en revision': 'En revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  completada: 'Completada',
}

// Mensajes de la historia de usuario.
export const MSG_OUT_OF_WINDOW = RETURN_MESSAGES.outOfWindow // A1
export const MSG_ALREADY_REQUESTED = RETURN_MESSAGES.alreadyRequested // A2
export const MSG_NO_ORDERS = 'No tienes pedidos disponibles para devolución' // A3
export const MSG_SAVE_ERROR =
  'No se pudo registrar la devolución, intenta de nuevo más tarde' // E1 / CA6

export const DELIVERED_ORDERS_LOAD_ERROR_MESSAGE =
  'No pudimos cargar tus pedidos entregados. Inténtalo de nuevo en unos momentos.'

export const RETURNS_LOAD_ERROR_MESSAGE =
  'No pudimos cargar tus devoluciones. Inténtalo de nuevo en unos momentos.'

export const MSG_REASON_REQUIRED = 'Selecciona el motivo de la devolución.' // RN5
export const MSG_METHOD_REQUIRED = 'Selecciona la forma de devolución.'
export const MSG_CONDITIONS_REQUIRED =
  'Debes confirmar que los lentes están sin uso y en su empaque original.' // RN3

type OrderForRules = { id: number; estado: EstadoPedido; fechaEntrega: string | null }
type ReturnForRules = { pedidoId: number; estado: EstadoDevolucion }

export type Eligibility =
  | { eligible: true; deadline: Date }
  | { eligible: false; message: string; detail?: string }

/** RN4: una devolución rechazada libera el pedido; cualquier otra lo bloquea. */
export function hasActiveReturn(orderId: number, returns: ReturnForRules[]): boolean {
  return returns.some(
    (item) => item.pedidoId === orderId && item.estado !== ESTADO_DEVOLUCION.rechazada,
  )
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * RN2: fecha_entrega + 8 × 24 horas, igual que `interval '8 days'` del trigger
 * devolucion_valida_solicitud (UTC). No depende de la zona horaria del navegador.
 */
export function returnDeadline(deliveredAt: string): Date {
  return new Date(new Date(deliveredAt).getTime() + RETURN_WINDOW_DAYS * DAY_MS)
}

/** Orden: RN1 → A2 (RN4) → A1 (RN2). Se permite hasta el límite exacto. */
export function evaluateEligibility(
  order: OrderForRules,
  returns: ReturnForRules[],
  now: Date = new Date(),
): Eligibility {
  if (order.estado !== ESTADO_PEDIDO.entregado) {
    return { eligible: false, message: RETURN_MESSAGES.notDelivered }
  }

  if (hasActiveReturn(order.id, returns)) {
    return { eligible: false, message: MSG_ALREADY_REQUESTED }
  }

  if (!order.fechaEntrega) {
    return {
      eligible: false,
      message: MSG_OUT_OF_WINDOW,
      detail: 'El pedido no tiene fecha de entrega registrada.',
    }
  }

  const deadline = returnDeadline(order.fechaEntrega)
  if (now > deadline) {
    return {
      eligible: false,
      message: MSG_OUT_OF_WINDOW,
      detail: `La devolución debía solicitarse dentro de ${RETURN_WINDOW_DAYS} días posteriores a la entrega.`,
    }
  }

  return { eligible: true, deadline }
}

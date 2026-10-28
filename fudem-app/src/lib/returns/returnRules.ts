// Reglas de negocio de devoluciones (HU7).
// Lo configurable vive aquí para cambiarlo en un solo lugar.

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
export const MSG_OUT_OF_WINDOW = 'Este pedido ya no cumple el plazo de devolución' // A1
export const MSG_ALREADY_REQUESTED = 'Este pedido ya tiene una devolución solicitada' // A2
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

type OrderForRules = { id: number; fechaEntrega: string | null }
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

export function returnDeadline(deliveredAt: string): Date {
  const deadline = new Date(deliveredAt)
  deadline.setDate(deadline.getDate() + RETURN_WINDOW_DAYS)
  return deadline
}

export function evaluateEligibility(
  order: OrderForRules,
  returns: ReturnForRules[],
  now: Date = new Date(),
): Eligibility {
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

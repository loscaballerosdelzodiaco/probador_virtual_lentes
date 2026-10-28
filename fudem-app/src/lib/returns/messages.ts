export const RETURN_MESSAGES = {
  // RN1: solo se devuelven pedidos entregados
  notDelivered: 'Este pedido aún no ha sido entregado',
  // A1 / RN2: pasaron más de 8 días desde la entrega
  outOfWindow: 'Este pedido ya no cumple el plazo de devolución',
  // A2 / RN4: el pedido ya tiene una devolución activa
  alreadyRequested: 'Este pedido ya tiene una devolución solicitada',
} as const

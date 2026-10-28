export const RETURN_MESSAGES = {
  // RN1: solo se devuelven pedidos entregados
  notDelivered: 'Este pedido aún no ha sido entregado',
  // A1 / RN2: pasaron más de 8 días desde la entrega
  outOfWindow: 'Este pedido ya no cumple el plazo de devolución',
  // A2 / RN4: el pedido ya tiene una devolución activa
  alreadyRequested: 'Este pedido ya tiene una devolución solicitada',
  // E1 / CA6: error al registrar o sin conexión
  saveError: 'No se pudo registrar la devolución, intenta de nuevo más tarde',
  // RN5: motivo obligatorio
  reasonRequired: 'Motivo de la devolución: selecciona el motivo de la devolución.',
  // CA2: forma de devolución obligatoria
  methodRequired: 'Forma de devolución: selecciona reembolso o cambio.',
  // RN3: confirmar que los lentes están sin uso y en su empaque original
  conditionsRequired:
    'Condiciones: marca la casilla para confirmar que los lentes están sin uso y en su empaque original.',
} as const

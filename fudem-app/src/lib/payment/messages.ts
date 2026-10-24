export const PAYMENT_MESSAGES = {
  // A2: número de tarjeta incompleto o inválido
  numberRequired: 'Número de tarjeta: este campo es obligatorio.',
  numberInvalid: 'Número de tarjeta: usa solo números.',
  numberLength: 'Número de tarjeta: debe tener entre 13 y 19 dígitos.',
  numberLuhn: 'Número de tarjeta: revisa el número, no es válido.',
  // A2: titular incompleto o inválido
  holderRequired: 'Titular: este campo es obligatorio.',
  holderInvalid: 'Titular: solo puede contener letras, espacios, tildes y ñ.',
  holderShort: 'Titular: debe tener al menos 2 caracteres.',
  // A2: vencimiento incompleto, inválido o vencido
  expiryRequired: 'Vencimiento: este campo es obligatorio.',
  expiryFormat: 'Vencimiento: usa el formato MM/AA.',
  expiryMonth: 'Vencimiento: el mes debe estar entre 01 y 12.',
  expiryExpired: 'Vencimiento: la tarjeta está vencida.',
  expiryTooFar:
    'Vencimiento: revisa el año, no puede ser más de 20 años desde hoy.',
  // A2: CVV incompleto o inválido
  cvvRequired: 'CVV: este campo es obligatorio.',
  cvvInvalid: 'CVV: usa solo números.',
  cvvLength: 'CVV: debe tener 3 dígitos.',
  cvvLengthAmex: 'CVV: debe tener 4 dígitos para American Express.',
  // T4: producto de la pantalla de pago
  productNotSelected: 'No seleccionaste ninguna montura.',
  productMissing: 'No encontramos esta montura disponible para comprar.',
  productNoPrice: 'Esta montura no tiene precio registrado, por eso no se puede comprar.',
  productLoadFailed:
    'No se pudo consultar el producto. Inténtalo de nuevo en unos momentos.',
  recipeRequired:
    'Necesitas una receta recibida para elaborar los lentes. Cárgala para continuar.',
  recipeLoadFailed:
    'No pudimos comprobar tu receta. Inténtalo de nuevo en unos momentos.',
  // E2 (CA5): continuar sin elegir forma de pago
  noMethod: 'Selecciona una forma de pago para continuar',
  // CA1: pago con tarjeta aprobado
  paid: 'Pago realizado con éxito',
  // A1, CA2, RN5: pago en tienda
  storePending: 'Tu pedido quedó registrado, pagarás al retirarlo en tienda',
  // T7: no se pudo crear el pedido (no se cobra)
  orderFailed: 'No pudimos registrar tu pedido. Inténtalo de nuevo en unos momentos.',
  // E1 (CA4): tarjeta declinada o sin fondos
  declined:
    'No se pudo procesar el pago, la tarjeta fue rechazada o no tiene fondos suficientes. Intenta con otra tarjeta',
  // T9: pago aprobado que no se pudo guardar (Reintentar no cobra de nuevo)
  recordFailed:
    'El pago fue aprobado, pero no pudimos guardarlo. Pulsa Reintentar; no se hará otro cobro.',
  // E3 (CA6): la pasarela no respondió
  serviceUnavailable:
    'No se pudo comunicar con el servicio de pago, no se realizó ningún cobro. Intenta de nuevo más tarde',
} as const

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
} as const

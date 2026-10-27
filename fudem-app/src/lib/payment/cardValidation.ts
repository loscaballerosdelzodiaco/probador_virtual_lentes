import { NAME_REGEX } from '../registroValidation'
import { PAYMENT_MESSAGES } from './messages'

export type CardData = {
  numero: string
  titular: string
  vencimiento: string
  cvv: string
}

export type CardField = keyof CardData

export type CardErrors = Partial<Record<CardField, string>>

/** Orden de los campos en pantalla: el primero con error recibe el foco. */
export const CARD_FIELDS: CardField[] = ['numero', 'titular', 'vencimiento', 'cvv']

const CARD_NUMBER_REGEX = /^[\d\s-]+$/
const EXPIRY_REGEX = /^(\d{2})\/(\d{2})$/
const DIGITS_REGEX = /^\d+$/
const AMEX_REGEX = /^3[47]/
const MIN_CARD_DIGITS = 13
const MAX_CARD_DIGITS = 16
const MIN_HOLDER_LENGTH = 2
const MAX_EXPIRY_YEARS = 20

/** Algoritmo de Luhn: detecta números mal escritos. */
export function passesLuhn(digits: string): boolean {
  let sum = 0
  for (let index = 0; index < digits.length; index += 1) {
    let digit = Number(digits[digits.length - 1 - index])
    if (index % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}

/** HU5 / T5 (A2, CA3): un mensaje por campo; nunca incluye los datos escritos (RN2). */
export function validateCard(
  card: CardData,
  today: Date = new Date(),
): CardErrors {
  const errors: CardErrors = {}
  const numero = card.numero.trim()
  const digits = numero.replace(/[\s-]/g, '')

  if (!numero) {
    errors.numero = PAYMENT_MESSAGES.numberRequired
  } else if (!CARD_NUMBER_REGEX.test(numero)) {
    errors.numero = PAYMENT_MESSAGES.numberInvalid
  } else if (digits.length < MIN_CARD_DIGITS || digits.length > MAX_CARD_DIGITS) {
    errors.numero = PAYMENT_MESSAGES.numberLength
  } else if (!passesLuhn(digits)) {
    errors.numero = PAYMENT_MESSAGES.numberLuhn
  }

  const titular = card.titular.trim()
  if (!titular) {
    errors.titular = PAYMENT_MESSAGES.holderRequired
  } else if (!NAME_REGEX.test(titular)) {
    errors.titular = PAYMENT_MESSAGES.holderInvalid
  } else if (titular.length < MIN_HOLDER_LENGTH) {
    errors.titular = PAYMENT_MESSAGES.holderShort
  }

  const vencimiento = card.vencimiento.trim()
  const expiry = EXPIRY_REGEX.exec(vencimiento)
  if (!vencimiento) {
    errors.vencimiento = PAYMENT_MESSAGES.expiryRequired
  } else if (!expiry) {
    errors.vencimiento = PAYMENT_MESSAGES.expiryFormat
  } else {
    const month = Number(expiry[1])
    // Meses contados desde el año 0 para comparar mes y año juntos
    const expiryMonths = (2000 + Number(expiry[2])) * 12 + (month - 1)
    const currentMonths = today.getFullYear() * 12 + today.getMonth()

    if (month < 1 || month > 12) {
      errors.vencimiento = PAYMENT_MESSAGES.expiryMonth
    } else if (expiryMonths < currentMonths) {
      // El mes en curso sigue siendo válido hasta su último día
      errors.vencimiento = PAYMENT_MESSAGES.expiryExpired
    } else if (expiryMonths > currentMonths + MAX_EXPIRY_YEARS * 12) {
      errors.vencimiento = PAYMENT_MESSAGES.expiryTooFar
    }
  }

  const cvv = card.cvv.trim()
  const isAmex = AMEX_REGEX.test(digits)
  if (!cvv) {
    errors.cvv = PAYMENT_MESSAGES.cvvRequired
  } else if (!DIGITS_REGEX.test(cvv)) {
    errors.cvv = PAYMENT_MESSAGES.cvvInvalid
  } else if (cvv.length !== (isAmex ? 4 : 3)) {
    errors.cvv = isAmex ? PAYMENT_MESSAGES.cvvLengthAmex : PAYMENT_MESSAGES.cvvLength
  }

  return errors
}

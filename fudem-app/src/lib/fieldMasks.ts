export function maskDui(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 8) return digits
  return `${digits.slice(0, 8)}-${digits.slice(8)}`
}

export function sanitizeName(value: string): string {
  return value.replace(/[^\p{L}\s'-]/gu, '')
}

/** HU5 / T5: número de tarjeta en grupos de 4, máximo 19 dígitos. */
export function maskCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 19)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

/** HU5 / T5: vencimiento MM/AA con la barra automática. */
export function maskCardExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

/** HU5 / T5: CVV solo con dígitos, máximo 4. */
export function maskCvv(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4)
}

export function phoneDigitCount(value: string): number {
  return value.replace(/\D/g, '').length
}

export function normalizePhone(value: string): string {
  const hasPlus = value.trim().startsWith('+')
  const digits = value.replace(/\D/g, '')
  return hasPlus ? `+${digits}` : digits
}

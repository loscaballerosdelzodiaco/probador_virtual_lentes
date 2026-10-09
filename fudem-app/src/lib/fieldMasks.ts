export function maskDui(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 8) return digits
  return `${digits.slice(0, 8)}-${digits.slice(8)}`
}

export function sanitizeName(value: string): string {
  return value.replace(/[^\p{L}\s'-]/gu, '')
}

export function phoneDigitCount(value: string): number {
  return value.replace(/\D/g, '').length
}

export function normalizePhone(value: string): string {
  const hasPlus = value.trim().startsWith('+')
  const digits = value.replace(/\D/g, '')
  return hasPlus ? `+${digits}` : digits
}

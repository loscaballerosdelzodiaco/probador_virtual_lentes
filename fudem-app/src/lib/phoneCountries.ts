export type PhoneCountry = {
  iso: string
  name: string
  dial: string
  length: number
  groups: number[]
  separator: string
}

export const DEFAULT_PHONE_COUNTRY = 'SV'

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'SV', name: 'El Salvador', dial: '503', length: 8, groups: [4, 4], separator: '-' },
  { iso: 'GT', name: 'Guatemala', dial: '502', length: 8, groups: [4, 4], separator: '-' },
  { iso: 'HN', name: 'Honduras', dial: '504', length: 8, groups: [4, 4], separator: '-' },
  { iso: 'NI', name: 'Nicaragua', dial: '505', length: 8, groups: [4, 4], separator: '-' },
  { iso: 'CR', name: 'Costa Rica', dial: '506', length: 8, groups: [4, 4], separator: '-' },
  { iso: 'PA', name: 'Panamá', dial: '507', length: 8, groups: [4, 4], separator: '-' },
  { iso: 'MX', name: 'México', dial: '52', length: 10, groups: [2, 4, 4], separator: ' ' },
  { iso: 'US', name: 'Estados Unidos', dial: '1', length: 10, groups: [3, 3, 4], separator: '-' },
  { iso: 'CA', name: 'Canadá', dial: '1', length: 10, groups: [3, 3, 4], separator: '-' },
  { iso: 'CO', name: 'Colombia', dial: '57', length: 10, groups: [3, 3, 4], separator: ' ' },
  { iso: 'VE', name: 'Venezuela', dial: '58', length: 10, groups: [3, 3, 4], separator: ' ' },
  { iso: 'EC', name: 'Ecuador', dial: '593', length: 9, groups: [2, 3, 4], separator: ' ' },
  { iso: 'PE', name: 'Perú', dial: '51', length: 9, groups: [3, 3, 3], separator: ' ' },
  { iso: 'BO', name: 'Bolivia', dial: '591', length: 8, groups: [4, 4], separator: '-' },
  { iso: 'CL', name: 'Chile', dial: '56', length: 9, groups: [1, 4, 4], separator: ' ' },
  { iso: 'AR', name: 'Argentina', dial: '54', length: 10, groups: [2, 4, 4], separator: ' ' },
  { iso: 'UY', name: 'Uruguay', dial: '598', length: 8, groups: [4, 4], separator: '-' },
  { iso: 'PY', name: 'Paraguay', dial: '595', length: 9, groups: [3, 3, 3], separator: ' ' },
  { iso: 'BR', name: 'Brasil', dial: '55', length: 11, groups: [2, 5, 4], separator: ' ' },
  { iso: 'ES', name: 'España', dial: '34', length: 9, groups: [3, 3, 3], separator: ' ' },
  { iso: 'GB', name: 'Reino Unido', dial: '44', length: 10, groups: [4, 3, 3], separator: ' ' },
  { iso: 'FR', name: 'Francia', dial: '33', length: 9, groups: [1, 2, 2, 2, 2], separator: ' ' },
  { iso: 'DE', name: 'Alemania', dial: '49', length: 11, groups: [3, 4, 4], separator: ' ' },
  { iso: 'IT', name: 'Italia', dial: '39', length: 10, groups: [3, 3, 4], separator: ' ' },
]

const COUNTRY_BY_ISO = new Map(PHONE_COUNTRIES.map((country) => [country.iso, country]))

export function getPhoneCountry(iso = DEFAULT_PHONE_COUNTRY): PhoneCountry {
  return COUNTRY_BY_ISO.get(iso) ?? PHONE_COUNTRIES[0]
}

export function flagEmoji(iso: string): string {
  return [...iso.toUpperCase()]
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join('')
}

export function phonePlaceholder(country: PhoneCountry): string {
  const digits = '0'.repeat(country.length)
  return formatNationalDigits(digits, country)
}

export function formatNationalDigits(digits: string, country: PhoneCountry): string {
  const limited = digits.replace(/\D/g, '').slice(0, country.length)
  const parts: string[] = []
  let index = 0

  for (const size of country.groups) {
    if (index >= limited.length) break
    parts.push(limited.slice(index, index + size))
    index += size
  }

  if (index < limited.length) {
    parts.push(limited.slice(index))
  }

  return parts.join(country.separator)
}

export function maskNationalPhone(value: string, iso: string): string {
  return formatNationalDigits(value, getPhoneCountry(iso))
}

export function composeInternationalPhone(iso: string, national: string): string {
  const country = getPhoneCountry(iso)
  const digits = national.replace(/\D/g, '').slice(0, country.length)
  return digits ? `+${country.dial}${digits}` : ''
}

export function parsePhoneInput(
  value: string,
  currentIso = DEFAULT_PHONE_COUNTRY,
): { iso: string; national: string } {
  const trimmed = value.trim()
  if (!trimmed.startsWith('+')) {
    return { iso: currentIso, national: maskNationalPhone(trimmed, currentIso) }
  }

  const digits = trimmed.replace(/\D/g, '')
  const matches = PHONE_COUNTRIES.filter((country) => digits.startsWith(country.dial)).sort(
    (a, b) => b.dial.length - a.dial.length,
  )
  const country = matches[0] ?? getPhoneCountry(currentIso)
  const nationalDigits = digits.slice(country.dial.length)

  return {
    iso: country.iso,
    national: formatNationalDigits(nationalDigits, country),
  }
}

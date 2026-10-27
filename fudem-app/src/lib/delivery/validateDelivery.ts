import type { DeliveryMethod } from './types'

export type DeliveryFormData = {
  method: DeliveryMethod | null
  departamentoId: string
  municipioId: string
  direccion: string
  telefono: string
  sucursalId: string
}

export type DeliveryField = keyof DeliveryFormData

export type DeliveryErrors = Partial<Record<DeliveryField, string>>

export const DELIVERY_ADDRESS_INCOMPLETE_MESSAGE = 'Completa la dirección de entrega'
export const DELIVERY_BRANCH_REQUIRED_MESSAGE =
  'Selecciona una sucursal para retirar tus lentes'
export const DELIVERY_METHOD_REQUIRED_MESSAGE = 'Selecciona una forma de entrega'
export const DELIVERY_NO_BRANCHES_MESSAGE = 'No hay sucursales disponibles para retiro'
export const DELIVERY_SAVE_ERROR_MESSAGE =
  'No se pudo guardar la forma de entrega, intenta de nuevo más tarde'
export const DELIVERY_PHONE_INVALID_MESSAGE =
  'Teléfono: usa solo dígitos, 8 números de El Salvador.'

const SV_PHONE_DIGITS = 8

export function deliveryPhoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function isValidElSalvadorPhone(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (/[^\d\s\-()+]/.test(trimmed)) return false
  return deliveryPhoneDigits(trimmed).length === SV_PHONE_DIGITS
}

export function hasDeliveryErrors(errors: DeliveryErrors): boolean {
  return Object.keys(errors).length > 0
}

/**
 * Valida solo la opción elegida. Los campos de la otra forma no se revisan.
 */
export function validateDelivery(formData: DeliveryFormData): DeliveryErrors {
  const errors: DeliveryErrors = {}

  if (!formData.method) {
    errors.method = DELIVERY_METHOD_REQUIRED_MESSAGE
    return errors
  }

  if (formData.method === 'domicilio') {
    if (!formData.departamentoId.trim()) {
      errors.departamentoId = DELIVERY_ADDRESS_INCOMPLETE_MESSAGE
    }
    if (!formData.municipioId.trim()) {
      errors.municipioId = DELIVERY_ADDRESS_INCOMPLETE_MESSAGE
    }
    if (!formData.direccion.trim()) {
      errors.direccion = DELIVERY_ADDRESS_INCOMPLETE_MESSAGE
    }
    if (!formData.telefono.trim()) {
      errors.telefono = DELIVERY_ADDRESS_INCOMPLETE_MESSAGE
    } else if (!isValidElSalvadorPhone(formData.telefono)) {
      errors.telefono = DELIVERY_PHONE_INVALID_MESSAGE
    }
    return errors
  }

  if (!formData.sucursalId.trim()) {
    errors.sucursalId = DELIVERY_BRANCH_REQUIRED_MESSAGE
  }

  return errors
}

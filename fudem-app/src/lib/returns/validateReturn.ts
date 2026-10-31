import { RETURN_MESSAGES } from './messages'
import type { FormaDevolucion, ReturnReason } from './returnRules'

export type ReturnFormData = {
  motivo: ReturnReason | ''
  forma: FormaDevolucion | ''
  condicionesConfirmadas: boolean
}

export type ReturnField = keyof ReturnFormData

export type ReturnErrors = Partial<Record<ReturnField, string>>

export function hasReturnErrors(errors: ReturnErrors): boolean {
  return Object.keys(errors).length > 0
}

/** RN5, forma obligatoria y RN3. El orden es el de los campos en pantalla. */
export function validateReturnForm(formData: ReturnFormData): ReturnErrors {
  const errors: ReturnErrors = {}

  if (!formData.motivo) {
    errors.motivo = RETURN_MESSAGES.reasonRequired
  }
  if (!formData.forma) {
    errors.forma = RETURN_MESSAGES.methodRequired
  }
  if (!formData.condicionesConfirmadas) {
    errors.condicionesConfirmadas = RETURN_MESSAGES.conditionsRequired
  }

  return errors
}

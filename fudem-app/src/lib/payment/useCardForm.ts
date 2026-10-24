import { useRef, useState } from 'react'
import {
  maskCardExpiry,
  maskCardNumber,
  maskCvv,
  sanitizeName,
} from '../fieldMasks'
import {
  CARD_FIELDS,
  validateCard,
  type CardData,
  type CardErrors,
  type CardField,
} from './cardValidation'

const EMPTY_CARD: CardData = { numero: '', titular: '', vencimiento: '', cvv: '' }

const CARD_MASKS: Record<CardField, (value: string) => string> = {
  numero: maskCardNumber,
  titular: sanitizeName,
  vencimiento: maskCardExpiry,
  cvv: maskCvv,
}

/**
 * HU5 / T5: valores y errores del formulario de tarjeta.
 * Los datos viven solo en memoria (RN2): no se guardan ni se envían desde aquí.
 */
export function useCardForm() {
  const [values, setValues] = useState<CardData>(EMPTY_CARD)
  const [errors, setErrors] = useState<CardErrors>({})
  // Tras el primer intento fallido, cada cambio vuelve a validar
  const [attempted, setAttempted] = useState(false)
  const inputs = useRef<Partial<Record<CardField, HTMLInputElement | null>>>({})

  function setField(field: CardField, value: string) {
    const next = { ...values, [field]: CARD_MASKS[field](value) }
    setValues(next)
    if (attempted) setErrors(validateCard(next))
  }

  function blurField() {
    if (attempted) setErrors(validateCard(values))
  }

  function inputRef(field: CardField) {
    return (element: HTMLInputElement | null) => {
      inputs.current[field] = element
    }
  }

  /** Devuelve true si la tarjeta es válida; si no, muestra los errores y enfoca el primero. */
  function validate(): boolean {
    const nextErrors = validateCard(values)
    setErrors(nextErrors)
    setAttempted(true)

    const firstError = CARD_FIELDS.find((field) => nextErrors[field])
    if (!firstError) return true
    inputs.current[firstError]?.focus()
    return false
  }

  function reset() {
    setValues(EMPTY_CARD)
    setErrors({})
    setAttempted(false)
  }

  return {
    validate,
    reset,
    formProps: { values, errors, onChange: setField, onBlur: blurField, inputRef },
  }
}

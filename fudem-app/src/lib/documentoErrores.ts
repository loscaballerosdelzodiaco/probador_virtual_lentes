import {
  DOCUMENTO_CORRUPT_ERROR_MESSAGE,
  DOCUMENTO_EMPTY_ERROR_MESSAGE,
  DOCUMENTO_EXTENSION_ERROR_MESSAGE,
  DOCUMENTO_MISMATCH_ERROR_MESSAGE,
  DOCUMENTO_SIZE_ERROR_MESSAGE,
} from './documentoValidation'

export type DocumentoErrorKind = 'validation' | 'temporary'

export const DOCUMENTO_CONNECTION_ERROR_MESSAGE =
  'No pudimos conectar para guardar la receta. Revisa tu conexión e inténtalo de nuevo.'

export const DOCUMENTO_VALIDATION_HINT =
  'Elige otro archivo o toma una fotografía nueva.'

export const DOCUMENTO_TEMPORARY_HINT =
  'Puedes reintentar con el mismo archivo, sin volver a seleccionarlo.'

export class DocumentoCargaError extends Error {
  readonly kind: DocumentoErrorKind

  constructor(
    message: string,
    kind: DocumentoErrorKind,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'DocumentoCargaError'
    this.kind = kind
  }
}

const VALIDATION_MESSAGES = new Set([
  DOCUMENTO_EMPTY_ERROR_MESSAGE,
  DOCUMENTO_EXTENSION_ERROR_MESSAGE,
  DOCUMENTO_CORRUPT_ERROR_MESSAGE,
  DOCUMENTO_MISMATCH_ERROR_MESSAGE,
  DOCUMENTO_SIZE_ERROR_MESSAGE,
])

export function isConnectionFailure(error: unknown): boolean {
  const text =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : ''
  return /failed to fetch|failed to send|networkerror|network request|load failed|timeout|offline|econn|functionsfetcherror|abort/i.test(
    text,
  )
}

export function isValidationMessage(message: string): boolean {
  return VALIDATION_MESSAGES.has(message)
}

export function clasificarErrorCarga(error: unknown): {
  message: string
  kind: DocumentoErrorKind
} {
  if (error instanceof DocumentoCargaError) {
    return { message: error.message, kind: error.kind }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      kind: isValidationMessage(error.message) ? 'validation' : 'temporary',
    }
  }

  return {
    message: DOCUMENTO_CONNECTION_ERROR_MESSAGE,
    kind: 'temporary',
  }
}

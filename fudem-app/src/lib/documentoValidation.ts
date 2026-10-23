export {
  ALLOWED_DOCUMENTO_EXTENSIONS,
  DEFAULT_MAX_DOCUMENTO_BYTES,
  DOCUMENTO_CORRUPT_ERROR_MESSAGE,
  DOCUMENTO_EMPTY_ERROR_MESSAGE,
  DOCUMENTO_EXTENSION_ERROR_MESSAGE,
  DOCUMENTO_FORMAT_ERROR_MESSAGE,
  DOCUMENTO_MISMATCH_ERROR_MESSAGE,
  detectarTipoPorContenido,
  documentoSizeErrorMessage,
  extensionOf,
  parseMaxDocumentoBytes,
  validarDocumentoBytes,
  type DocumentoKind,
  type DocumentoValidationCode,
  type DocumentoValidationResult,
} from '../../../supabase/functions/_shared/documentoValidation'

import {
  DOCUMENTO_EMPTY_ERROR_MESSAGE,
  DEFAULT_MAX_DOCUMENTO_BYTES,
  documentoSizeErrorMessage,
  parseMaxDocumentoBytes,
  validarDocumentoBytes,
} from '../../../supabase/functions/_shared/documentoValidation'

export const MAX_DOCUMENTO_BYTES = parseMaxDocumentoBytes(
  import.meta.env.VITE_MAX_DOCUMENTO_BYTES,
  DEFAULT_MAX_DOCUMENTO_BYTES,
)

export const DOCUMENTO_SIZE_ERROR_MESSAGE = documentoSizeErrorMessage(MAX_DOCUMENTO_BYTES)

export async function validarArchivoDocumento(file: File): Promise<string | null> {
  if (file.size <= 0) return DOCUMENTO_EMPTY_ERROR_MESSAGE
  if (file.size > MAX_DOCUMENTO_BYTES) return DOCUMENTO_SIZE_ERROR_MESSAGE

  const bytes = new Uint8Array(await file.arrayBuffer())
  const result = validarDocumentoBytes({
    bytes,
    fileName: file.name,
    maxBytes: MAX_DOCUMENTO_BYTES,
  })
  return result.ok ? null : result.error
}

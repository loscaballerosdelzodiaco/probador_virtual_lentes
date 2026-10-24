export const DEFAULT_MAX_DOCUMENTO_BYTES = 10 * 1024 * 1024

export const ALLOWED_DOCUMENTO_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp'] as const

export type DocumentoKind = 'pdf' | 'jpeg' | 'png' | 'webp'

export type DocumentoValidationCode =
  | 'empty'
  | 'size'
  | 'extension'
  | 'corrupt'
  | 'mismatch'

export type DocumentoValidationResult =
  | {
      ok: true
      kind: DocumentoKind
      mime: string
      extension: string
    }
  | {
      ok: false
      code: DocumentoValidationCode
      error: string
    }

export const DOCUMENTO_EMPTY_ERROR_MESSAGE =
  'El archivo está vacío. Elige otro e inténtalo de nuevo.'

export const DOCUMENTO_EXTENSION_ERROR_MESSAGE =
  'La extensión no está permitida. Usa PDF, JPG, PNG o WEBP.'

export const DOCUMENTO_CORRUPT_ERROR_MESSAGE =
  'El archivo está dañado o no es un PDF o una imagen válida. Elige otro e inténtalo de nuevo.'

export const DOCUMENTO_MISMATCH_ERROR_MESSAGE =
  'La extensión no coincide con el contenido. Usa PDF, JPG, PNG o WEBP según el archivo real.'

export const DOCUMENTO_FORMAT_ERROR_MESSAGE = DOCUMENTO_EXTENSION_ERROR_MESSAGE

export function documentoSizeErrorMessage(maxBytes: number): string {
  const megaBytes = Math.max(1, Math.round(maxBytes / (1024 * 1024)))
  return `El archivo no puede superar ${megaBytes} MB.`
}

export function parseMaxDocumentoBytes(
  raw: string | undefined,
  fallback = DEFAULT_MAX_DOCUMENTO_BYTES,
): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

export function extensionOf(fileName: string): string {
  const base = fileName.replaceAll('\\', '/').split('/').pop() ?? ''
  const dot = base.lastIndexOf('.')
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : ''
}

const KIND_BY_EXTENSION: Record<string, DocumentoKind> = {
  pdf: 'pdf',
  jpg: 'jpeg',
  jpeg: 'jpeg',
  png: 'png',
  webp: 'webp',
}

const MIME_BY_KIND: Record<DocumentoKind, string> = {
  pdf: 'application/pdf',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

const EXTENSION_BY_KIND: Record<DocumentoKind, string> = {
  pdf: 'pdf',
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
}

function bytesStartWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false
  return signature.every((value, index) => bytes[offset + index] === value)
}

export function detectarTipoPorContenido(bytes: Uint8Array): DocumentoKind | null {
  if (bytesStartWith(bytes, [0x25, 0x50, 0x44, 0x46])) {
    return bytes.length >= 8 ? 'pdf' : null
  }

  if (bytesStartWith(bytes, [0xff, 0xd8, 0xff])) {
    const hasEnd =
      bytes.length >= 4 &&
      bytes[bytes.length - 2] === 0xff &&
      bytes[bytes.length - 1] === 0xd9
    return hasEnd ? 'jpeg' : null
  }

  if (bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return bytesStartWith(bytes, [0x49, 0x48, 0x44, 0x52], 12) ? 'png' : null
  }

  if (
    bytesStartWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytesStartWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'webp'
  }

  return null
}

export function validarDocumentoBytes(input: {
  bytes: Uint8Array
  fileName: string
  maxBytes?: number
}): DocumentoValidationResult {
  const maxBytes = input.maxBytes ?? DEFAULT_MAX_DOCUMENTO_BYTES
  const sizeError = documentoSizeErrorMessage(maxBytes)

  if (input.bytes.length <= 0) {
    return { ok: false, code: 'empty', error: DOCUMENTO_EMPTY_ERROR_MESSAGE }
  }

  if (input.bytes.length > maxBytes) {
    return { ok: false, code: 'size', error: sizeError }
  }

  const extension = extensionOf(input.fileName)
  const kindFromName = KIND_BY_EXTENSION[extension]
  if (!kindFromName) {
    return { ok: false, code: 'extension', error: DOCUMENTO_EXTENSION_ERROR_MESSAGE }
  }

  const kindFromBytes = detectarTipoPorContenido(input.bytes)
  if (!kindFromBytes) {
    return { ok: false, code: 'corrupt', error: DOCUMENTO_CORRUPT_ERROR_MESSAGE }
  }

  if (kindFromBytes !== kindFromName) {
    return { ok: false, code: 'mismatch', error: DOCUMENTO_MISMATCH_ERROR_MESSAGE }
  }

  return {
    ok: true,
    kind: kindFromBytes,
    mime: MIME_BY_KIND[kindFromBytes],
    extension: EXTENSION_BY_KIND[kindFromBytes],
  }
}

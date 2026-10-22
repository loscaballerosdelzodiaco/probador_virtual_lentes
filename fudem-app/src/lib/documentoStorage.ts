/**
 * Recetas y exámenes se guardan en el bucket privado `documentos` de
 * Supabase Storage. La app solo usa la clave publicable y la sesión del
 * cliente; no hay URLs públicas ni clave de servicio.
 *
 * Configuración necesaria (ya incluida en la migración
 * `supabase/migrations/20261022041219_documento_cliente.sql`):
 * - Bucket `documentos`, `public = false`, máximo 10 MB.
 * - MIME permitidos: application/pdf, image/jpeg, image/png, image/webp.
 * - Políticas de Storage: el usuario autenticado solo lee y escribe
 *   objetos cuya primera carpeta es su `auth.uid()`.
 * - Tabla `documento.ubicacion_archivo` guarda esa misma ruta.
 */
import { supabase } from './supabase'

export const DOCUMENTOS_BUCKET = 'documentos'
export const MAX_DOCUMENTO_BYTES = 10 * 1024 * 1024

export const DOCUMENTO_FORMAT_ERROR_MESSAGE =
  'Usa un PDF o una imagen JPG, PNG o WEBP.'

export const DOCUMENTO_SIZE_ERROR_MESSAGE =
  'El archivo no puede superar 10 MB.'

export const DOCUMENTO_STORAGE_ERROR_MESSAGE =
  'No pudimos guardar el archivo. Inténtalo de nuevo en unos momentos.'

export const DOCUMENTO_DOWNLOAD_ERROR_MESSAGE =
  'No pudimos abrir el archivo. Inténtalo de nuevo en unos momentos.'

export const DOCUMENTO_ACCESS_ERROR_MESSAGE =
  'No pudimos acceder a ese archivo. Inicia sesión e inténtalo de nuevo.'

const MIME_TO_EXTENSION: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/pjpeg': 'jpg',
  'image/png': 'png',
  'image/x-png': 'png',
  'image/webp': 'webp',
}

const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : ''
}

export function sanitizeNombreArchivo(fileName: string): string {
  const base = fileName.replaceAll('\\', '/').split('/').pop()?.trim() ?? ''
  const cleaned = base.replace(/[^\w.\-áéíóúüñÁÉÍÓÚÜÑ ]+/g, '_').slice(0, 255)
  return cleaned || 'documento'
}

export function mimeOfDocumento(file: File): string | null {
  const type = file.type.toLowerCase()
  if (MIME_TO_EXTENSION[type]) {
    return type === 'image/jpg' || type === 'image/pjpeg' ? 'image/jpeg' : type === 'image/x-png' ? 'image/png' : type
  }
  if (type && type !== 'application/octet-stream') return null
  return EXTENSION_TO_MIME[extensionOf(file.name)] ?? null
}

function bytesStartWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false
  return signature.every((value, index) => bytes[index] === value)
}

export function contenidoCoincideConMime(bytes: Uint8Array, mime: string): boolean {
  if (mime === 'application/pdf') {
    return bytesStartWith(bytes, [0x25, 0x50, 0x44, 0x46])
  }
  if (mime === 'image/jpeg') {
    return bytesStartWith(bytes, [0xff, 0xd8, 0xff])
  }
  if (mime === 'image/png') {
    return bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  }
  if (mime === 'image/webp') {
    return (
      bytesStartWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      bytes.length >= 12 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    )
  }
  return false
}

export function validateDocumentoFile(file: File): string | null {
  if (!mimeOfDocumento(file)) return DOCUMENTO_FORMAT_ERROR_MESSAGE
  if (file.size <= 0 || file.size > MAX_DOCUMENTO_BYTES) {
    return file.size > MAX_DOCUMENTO_BYTES
      ? DOCUMENTO_SIZE_ERROR_MESSAGE
      : DOCUMENTO_FORMAT_ERROR_MESSAGE
  }
  return null
}

export async function validateDocumentoContenido(file: File): Promise<string | null> {
  const formatoError = validateDocumentoFile(file)
  if (formatoError) return formatoError

  const mime = mimeOfDocumento(file)
  if (!mime) return DOCUMENTO_FORMAT_ERROR_MESSAGE

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (!contenidoCoincideConMime(header, mime)) {
    return DOCUMENTO_FORMAT_ERROR_MESSAGE
  }
  return null
}

export function buildUbicacionArchivo(
  usuarioId: string,
  tipo: 'receta' | 'examen',
  file: File,
  id = crypto.randomUUID(),
): string {
  const mime = mimeOfDocumento(file)
  const extension = mime ? MIME_TO_EXTENSION[mime] : extensionOf(file.name) || 'bin'
  return `${usuarioId}/${tipo}/${id}.${extension}`
}

export function ubicacionPerteneceAlUsuario(
  usuarioId: string,
  ubicacionArchivo: string,
): boolean {
  return ubicacionArchivo.startsWith(`${usuarioId}/`) && !ubicacionArchivo.includes('..')
}

export function messageFromStorageError(error: {
  message?: string
  statusCode?: string | number
}): string {
  const text = `${error.statusCode ?? ''} ${error.message ?? ''}`
  if (/413|too large|maximum|file size|payload/i.test(text)) {
    return DOCUMENTO_SIZE_ERROR_MESSAGE
  }
  if (/415|mime|not allowed|content.?type|invalid.*type/i.test(text)) {
    return DOCUMENTO_FORMAT_ERROR_MESSAGE
  }
  if (/401|403|jwt|unauthorized|not authorized|row-level|permission/i.test(text)) {
    return DOCUMENTO_ACCESS_ERROR_MESSAGE
  }
  return DOCUMENTO_STORAGE_ERROR_MESSAGE
}

export async function requireUsuarioId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error(DOCUMENTO_ACCESS_ERROR_MESSAGE, { cause: error })
  }
  return data.user.id
}

export async function uploadDocumentoFile(
  ubicacionArchivo: string,
  file: File,
): Promise<void> {
  const mime = mimeOfDocumento(file)
  const { error } = await supabase.storage.from(DOCUMENTOS_BUCKET).upload(ubicacionArchivo, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: mime ?? file.type,
  })

  if (error) {
    throw new Error(messageFromStorageError(error), { cause: error })
  }
}

export async function removeDocumentoFile(ubicacionArchivo: string): Promise<void> {
  const { error } = await supabase.storage.from(DOCUMENTOS_BUCKET).remove([ubicacionArchivo])
  if (error) {
    console.error(error)
  }
}

export async function downloadDocumentoFile(ubicacionArchivo: string): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTOS_BUCKET)
    .download(ubicacionArchivo)

  if (error || !data) {
    throw new Error(
      error ? messageFromStorageError(error) : DOCUMENTO_DOWNLOAD_ERROR_MESSAGE,
      { cause: error },
    )
  }

  return data
}

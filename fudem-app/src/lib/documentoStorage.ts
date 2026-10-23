/**
 * Recetas y exámenes se guardan en el bucket privado `documentos`.
 * El cliente valida el archivo y la Edge Function `validar-documento`
 * vuelve a inspeccionar los bytes reales. El límite de tamaño se configura
 * con VITE_MAX_DOCUMENTO_BYTES (app) y MAX_DOCUMENTO_BYTES (función).
 */
import {
  DOCUMENTO_CORRUPT_ERROR_MESSAGE,
  DOCUMENTO_FORMAT_ERROR_MESSAGE,
  DOCUMENTO_SIZE_ERROR_MESSAGE,
  MAX_DOCUMENTO_BYTES,
  validarArchivoDocumento,
  validarDocumentoBytes,
} from './documentoValidation'
import { supabase } from './supabase'

export {
  DOCUMENTO_CORRUPT_ERROR_MESSAGE,
  DOCUMENTO_EMPTY_ERROR_MESSAGE,
  DOCUMENTO_EXTENSION_ERROR_MESSAGE,
  DOCUMENTO_FORMAT_ERROR_MESSAGE,
  DOCUMENTO_MISMATCH_ERROR_MESSAGE,
  DOCUMENTO_SIZE_ERROR_MESSAGE,
  MAX_DOCUMENTO_BYTES,
  validarArchivoDocumento,
} from './documentoValidation'

export const DOCUMENTOS_BUCKET = 'documentos'
export const VALIDAR_DOCUMENTO_FUNCTION = 'validar-documento'

export const DOCUMENTO_STORAGE_ERROR_MESSAGE =
  'No pudimos guardar el archivo. Inténtalo de nuevo en unos momentos.'

export const DOCUMENTO_DOWNLOAD_ERROR_MESSAGE =
  'No pudimos abrir el archivo. Inténtalo de nuevo en unos momentos.'

export const DOCUMENTO_ACCESS_ERROR_MESSAGE =
  'No pudimos acceder a ese archivo. Inicia sesión e inténtalo de nuevo.'

export { extensionOf, sanitizeNombreArchivo }

function sanitizeNombreArchivo(fileName: string): string {
  const base = fileName.replaceAll('\\', '/').split('/').pop()?.trim() ?? ''
  const cleaned = base.replace(/[^\w.\-áéíóúüñÁÉÍÓÚÜÑ ]+/g, '_').slice(0, 255)
  return cleaned || 'documento'
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : ''
}

export async function validateDocumentoFile(file: File): Promise<string | null> {
  return validarArchivoDocumento(file)
}

export async function validateDocumentoContenido(file: File): Promise<string | null> {
  return validarArchivoDocumento(file)
}

export function buildUbicacionArchivo(
  usuarioId: string,
  tipo: 'receta' | 'examen',
  file: File,
  id = crypto.randomUUID(),
  extension?: string,
): string {
  const ext = extension ?? (extensionOf(file.name) || 'bin')
  return `${usuarioId}/${tipo}/${id}.${ext}`
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
  if (/415|mime|not allowed|content.?type|invalid.*type|corrupt|damaged/i.test(text)) {
    return DOCUMENTO_FORMAT_ERROR_MESSAGE
  }
  if (/401|403|jwt|unauthorized|not authorized|row-level|permission/i.test(text)) {
    return DOCUMENTO_ACCESS_ERROR_MESSAGE
  }
  return DOCUMENTO_STORAGE_ERROR_MESSAGE
}

async function messageFromFunctionFailure(
  error: { message?: string; context?: Response } | null,
  data: unknown,
): Promise<string> {
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    return data.error
  }

  const response = error?.context
  if (response) {
    try {
      const body: unknown = await response.clone().json()
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
        return body.error
      }
    } catch {
      // El cuerpo no era JSON; se usa el mensaje genérico.
    }
  }

  return DOCUMENTO_CORRUPT_ERROR_MESSAGE
}

export async function validarDocumentoEnServidor(file: File): Promise<{
  mime: string
  extension: string
}> {
  const payload = new FormData()
  payload.append('archivo', file)

  const { data, error } = await supabase.functions.invoke(VALIDAR_DOCUMENTO_FUNCTION, {
    body: payload,
  })

  if (error || !data || typeof data !== 'object' || !('ok' in data) || data.ok !== true) {
    throw new Error(await messageFromFunctionFailure(error, data))
  }

  const mime = 'mime' in data && typeof data.mime === 'string' ? data.mime : ''
  const extension =
    'extension' in data && typeof data.extension === 'string' ? data.extension : ''
  if (!mime || !extension) {
    throw new Error(DOCUMENTO_CORRUPT_ERROR_MESSAGE)
  }

  return { mime, extension }
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
  contentType?: string,
): Promise<void> {
  const { error } = await supabase.storage.from(DOCUMENTOS_BUCKET).upload(ubicacionArchivo, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: contentType ?? file.type,
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

export async function inspeccionarArchivoLocal(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  return validarDocumentoBytes({
    bytes,
    fileName: file.name,
    maxBytes: MAX_DOCUMENTO_BYTES,
  })
}

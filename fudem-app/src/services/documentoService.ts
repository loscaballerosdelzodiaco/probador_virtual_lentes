import {
  CalidadInsuficienteError,
  evaluarCalidadArchivo,
} from '../lib/documentoCalidad'
import { DocumentoCargaError } from '../lib/documentoErrores'
import {
  DOCUMENTO_ACCESS_ERROR_MESSAGE,
  buildUbicacionArchivo,
  downloadDocumentoFile,
  inspeccionarArchivoLocal,
  removeDocumentoFile,
  requireUsuarioId,
  sanitizeNombreArchivo,
  ubicacionPerteneceAlUsuario,
  uploadDocumentoFile,
  validarDocumentoEnServidor,
} from '../lib/documentoStorage'
import { supabase } from '../lib/supabase'

export const DOCUMENTO_TABLE = 'documento'
export const VALIDACION_DOCUMENTO_TABLE = 'validacion_documento'

export const TIPOS_DOCUMENTO = ['receta', 'examen'] as const
export const ESTADOS_RECEPCION = [
  'pendiente',
  'recibida',
  'rechazada',
  'calidad_insuficiente',
] as const

export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number]
export type EstadoRecepcion = (typeof ESTADOS_RECEPCION)[number]
export type ResultadoValidacion = Exclude<EstadoRecepcion, 'pendiente'>

export type DocumentoCliente = {
  id: number
  usuario_id: string
  nombre_archivo: string
  tipo: TipoDocumento
  fecha_carga: string
  ubicacion_archivo: string
  estado_recepcion: EstadoRecepcion
}

export type NuevoDocumento = {
  nombre_archivo: string
  tipo: TipoDocumento
  ubicacion_archivo: string
}

export type ValidacionDocumento = {
  id: number
  documento_id: number
  resultado: ResultadoValidacion
  motivo: string | null
  fecha_validacion: string
  validador_id: string | null
}

const DOCUMENTO_COLUMNS =
  'id, usuario_id, nombre_archivo, tipo, fecha_carga, ubicacion_archivo, estado_recepcion'

const VALIDACION_COLUMNS =
  'id, documento_id, resultado, motivo, fecha_validacion, validador_id'

export const DOCUMENTOS_LOAD_ERROR_MESSAGE =
  'No pudimos cargar tus recetas y exámenes. Inténtalo de nuevo en unos momentos.'

export const DOCUMENTO_REGISTRO_ERROR_MESSAGE =
  'No pudimos registrar el archivo. Inténtalo de nuevo en unos momentos.'

export function buildDocumentoInsert(documento: NuevoDocumento) {
  return {
    nombre_archivo: documento.nombre_archivo.trim(),
    tipo: documento.tipo,
    ubicacion_archivo: documento.ubicacion_archivo.trim(),
    estado_recepcion: 'recibida' as const,
  }
}

export async function listarDocumentos(): Promise<DocumentoCliente[]> {
  await requireUsuarioId()

  const { data, error } = await supabase
    .from(DOCUMENTO_TABLE)
    .select(DOCUMENTO_COLUMNS)
    .order('fecha_carga', { ascending: false })
    .returns<DocumentoCliente[]>()

  if (error) {
    throw new DocumentoCargaError(DOCUMENTOS_LOAD_ERROR_MESSAGE, 'temporary', {
      cause: error,
    })
  }

  return data ?? []
}

export function recetaAceptadaDe(
  documentos: DocumentoCliente[],
): DocumentoCliente | null {
  return (
    documentos.find(
      (documento) =>
        documento.tipo === 'receta' && documento.estado_recepcion === 'recibida',
    ) ?? null
  )
}

export async function obtenerRecetaAceptada(): Promise<DocumentoCliente | null> {
  return recetaAceptadaDe(await listarDocumentos())
}

export async function registrarDocumento(
  documento: NuevoDocumento,
): Promise<DocumentoCliente> {
  const { data, error } = await supabase
    .from(DOCUMENTO_TABLE)
    .insert(buildDocumentoInsert(documento))
    .select(DOCUMENTO_COLUMNS)
    .returns<DocumentoCliente>()
    .single()

  if (error || !data) {
    throw new DocumentoCargaError(DOCUMENTO_REGISTRO_ERROR_MESSAGE, 'temporary', {
      cause: error,
    })
  }

  return data
}

export async function guardarDocumento(
  tipo: TipoDocumento,
  file: File,
): Promise<DocumentoCliente> {
  const local = await inspeccionarArchivoLocal(file)
  if (!local.ok) {
    throw new DocumentoCargaError(local.error, 'validation')
  }

  const calidad = await evaluarCalidadArchivo(file)
  if (!calidad.ok) {
    throw new CalidadInsuficienteError(calidad)
  }

  const servidor = await validarDocumentoEnServidor(file)
  const usuarioId = await requireUsuarioId()
  const ubicacionArchivo = buildUbicacionArchivo(
    usuarioId,
    tipo,
    file,
    crypto.randomUUID(),
    servidor.extension,
  )
  await uploadDocumentoFile(ubicacionArchivo, file, servidor.mime)

  try {
    return await registrarDocumento({
      nombre_archivo: sanitizeNombreArchivo(file.name),
      tipo,
      ubicacion_archivo: ubicacionArchivo,
    })
  } catch (error) {
    await removeDocumentoFile(ubicacionArchivo)
    throw error
  }
}

export async function descargarDocumento(documento: DocumentoCliente): Promise<Blob> {
  const usuarioId = await requireUsuarioId()
  if (
    documento.usuario_id !== usuarioId ||
    !ubicacionPerteneceAlUsuario(usuarioId, documento.ubicacion_archivo)
  ) {
    throw new DocumentoCargaError(DOCUMENTO_ACCESS_ERROR_MESSAGE, 'temporary')
  }

  return downloadDocumentoFile(documento.ubicacion_archivo)
}

export async function listarValidacion(
  documentoId: number,
): Promise<ValidacionDocumento | null> {
  const { data, error } = await supabase
    .from(VALIDACION_DOCUMENTO_TABLE)
    .select(VALIDACION_COLUMNS)
    .eq('documento_id', documentoId)
    .returns<ValidacionDocumento>()
    .maybeSingle()

  if (error) {
    throw new DocumentoCargaError(DOCUMENTOS_LOAD_ERROR_MESSAGE, 'temporary', {
      cause: error,
    })
  }

  return data
}

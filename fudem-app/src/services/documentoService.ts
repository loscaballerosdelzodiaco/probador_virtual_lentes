import { supabase } from '../lib/supabase'

export const DOCUMENTO_TABLE = 'documento'
export const VALIDACION_DOCUMENTO_TABLE = 'validacion_documento'

export const TIPOS_DOCUMENTO = ['receta', 'examen'] as const
export const ESTADOS_RECEPCION = ['pendiente', 'recibida', 'rechazada'] as const

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
  usuario_id: string
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
    usuario_id: documento.usuario_id,
    nombre_archivo: documento.nombre_archivo.trim(),
    tipo: documento.tipo,
    ubicacion_archivo: documento.ubicacion_archivo.trim(),
    estado_recepcion: 'pendiente' as const,
  }
}

export async function listarDocumentos(
  usuarioId: string,
): Promise<DocumentoCliente[]> {
  const { data, error } = await supabase
    .from(DOCUMENTO_TABLE)
    .select(DOCUMENTO_COLUMNS)
    .eq('usuario_id', usuarioId)
    .order('fecha_carga', { ascending: false })
    .returns<DocumentoCliente[]>()

  if (error) {
    throw new Error(DOCUMENTOS_LOAD_ERROR_MESSAGE, { cause: error })
  }

  return data ?? []
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
    throw new Error(DOCUMENTO_REGISTRO_ERROR_MESSAGE, { cause: error })
  }

  return data
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
    throw new Error(DOCUMENTOS_LOAD_ERROR_MESSAGE, { cause: error })
  }

  return data
}

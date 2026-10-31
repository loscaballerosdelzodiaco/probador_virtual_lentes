import { supabase } from '../lib/supabase'

/**
 * HU6. Equivale a POST /pedidos/:id/entrega.
 * El proyecto no tiene un servidor propio: el pedido y el pago se guardan
 * con el cliente de Supabase y la sesión. Esta función hace lo mismo.
 * El usuario sale de la sesión; el cuerpo no trae un id de cliente.
 *
 * Tablas de T2: entrega, sucursal, departamento, municipio.
 * pedido.forma_pago es la forma de pago (tarjeta o tienda).
 */

export const ENTREGA_GUARDADO_ERROR_MESSAGE =
  'No se pudo guardar la forma de entrega, intenta de nuevo más tarde'

export const ENTREGA_SESION_ERROR_MESSAGE =
  'Inicia sesión para registrar la forma de entrega.'

export const ENTREGA_AJENO_ERROR_MESSAGE =
  'No puedes registrar la entrega de un pedido de otro cliente.'

export const ENTREGA_PEDIDO_ERROR_MESSAGE = 'No encontramos ese pedido.'

export const ENTREGA_PAGO_ERROR_MESSAGE =
  'El pedido no tiene una forma de pago registrada.'

export const ENTREGA_DUPLICADA_ERROR_MESSAGE =
  'Este pedido ya tiene una forma de entrega.'

export const ENTREGA_SUCURSAL_INACTIVA_ERROR_MESSAGE =
  'La sucursal está inactiva y no puede elegirse para el retiro.'

/** Postgres: violación de unicidad. entrega.pedido_id es único. */
const ENTREGA_UNICA_CODE = '23505'
/** Postgres: raise exception del trigger de entrega. */
const TRIGGER_ERROR_CODE = 'P0001'

const ENTREGA_COLUMNS =
  'id, pedido_id, tipo, departamento_id, municipio_id, direccion, telefono, sucursal_id, fecha_registro'

export type TipoEntrega = 'domicilio' | 'sucursal'

export type EntregaErrorCode =
  | 'sesion'
  | 'ajeno'
  | 'pedido_inexistente'
  | 'sin_forma_pago'
  | 'entrega_registrada'
  | 'datos_invalidos'
  | 'sucursal_inactiva'
  | 'guardado'

export type RegistrarEntregaInput = {
  tipo: TipoEntrega | string
  departamentoId?: unknown
  municipioId?: unknown
  direccion?: unknown
  telefono?: unknown
  sucursalId?: unknown
}

export type EntregaRegistrada = {
  id: number
  pedidoId: number
  tipo: TipoEntrega
  departamentoId: number | null
  municipioId: number | null
  direccion: string | null
  telefono: string | null
  sucursalId: number | null
  fechaRegistro: string
}

type EntregaRow = {
  id: number
  pedido_id: number
  tipo: TipoEntrega
  departamento_id: number | null
  municipio_id: number | null
  direccion: string | null
  telefono: string | null
  sucursal_id: number | null
  fecha_registro: string
}

type PedidoRow = {
  id: number
  usuario_id: string
  forma_pago: string | null
}

type MunicipioRow = {
  id: number
  departamento_id: number
}

type SucursalRow = {
  id: number
  activa: boolean
}

type EntregaInsert = {
  pedido_id: number
  tipo: TipoEntrega
  departamento_id: number | null
  municipio_id: number | null
  direccion: string | null
  telefono: string | null
  sucursal_id: number | null
}

type DbError = { message?: string; code?: string } | null

export class EntregaError extends Error {
  readonly status: number
  readonly code: EntregaErrorCode

  constructor(
    message: string,
    code: EntregaErrorCode,
    status: number,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'EntregaError'
    this.code = code
    this.status = status
  }
}

export function isEntregaError(error: unknown): error is EntregaError {
  return error instanceof EntregaError
}

function rechazo(
  message: string,
  code: EntregaErrorCode,
  status: number,
  cause?: unknown,
): EntregaError {
  return new EntregaError(message, code, status, cause === undefined ? undefined : { cause })
}

function falloAlGuardar(cause: unknown): EntregaError {
  return rechazo(ENTREGA_GUARDADO_ERROR_MESSAGE, 'guardado', 500, cause)
}

function idPositivo(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return Number(value)
  return null
}

function datoPresente(value: unknown): boolean {
  return value !== undefined && value !== null
}

/** Misma limpieza que el trigger de T2: quedan dígitos y un + opcional. */
export function telefonoDeContacto(value: string): string | null {
  const compacto = value.replace(/[^0-9+]/g, '')
  return /^\+?[0-9]{8,15}$/.test(compacto) ? compacto : null
}

async function usuarioDeLaSesion(): Promise<string> {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      throw rechazo(ENTREGA_SESION_ERROR_MESSAGE, 'sesion', 401, error)
    }
    return data.user.id
  } catch (error) {
    if (error instanceof EntregaError) throw error
    throw rechazo(ENTREGA_SESION_ERROR_MESSAGE, 'sesion', 401, error)
  }
}

function validarDomicilio(input: RegistrarEntregaInput): {
  departamentoId: number
  municipioId: number
  direccion: string
  telefono: string
} {
  if (datoPresente(input.sucursalId)) {
    throw rechazo(
      'El envío a domicilio no lleva sucursal.',
      'datos_invalidos',
      400,
    )
  }

  const departamentoId = idPositivo(input.departamentoId)
  const municipioId = idPositivo(input.municipioId)
  if (departamentoId === null || municipioId === null) {
    throw rechazo(
      'Elige un departamento y un municipio.',
      'datos_invalidos',
      400,
    )
  }

  if (typeof input.direccion !== 'string') {
    throw rechazo('La dirección de entrega es obligatoria.', 'datos_invalidos', 400)
  }
  const direccion = input.direccion.trim()
  if (direccion.length < 1 || direccion.length > 300) {
    throw rechazo('La dirección de entrega es obligatoria.', 'datos_invalidos', 400)
  }

  if (typeof input.telefono !== 'string') {
    throw rechazo('El teléfono de contacto es obligatorio.', 'datos_invalidos', 400)
  }
  const telefono = telefonoDeContacto(input.telefono)
  if (telefono === null) {
    throw rechazo(
      'El teléfono de contacto debe tener entre 8 y 15 dígitos.',
      'datos_invalidos',
      400,
    )
  }

  return { departamentoId, municipioId, direccion, telefono }
}

function validarSucursal(input: RegistrarEntregaInput): number {
  if (
    datoPresente(input.departamentoId) ||
    datoPresente(input.municipioId) ||
    datoPresente(input.direccion) ||
    datoPresente(input.telefono)
  ) {
    throw rechazo(
      'El retiro en sucursal no lleva dirección ni teléfono.',
      'datos_invalidos',
      400,
    )
  }

  const sucursalId = idPositivo(input.sucursalId)
  if (sucursalId === null) {
    throw rechazo('Elige una sucursal.', 'datos_invalidos', 400)
  }
  return sucursalId
}

async function leerPedido(pedidoId: number, usuarioId: string): Promise<void> {
  const { data, error } = await supabase
    .from('pedido')
    .select('id, usuario_id, forma_pago')
    .eq('id', pedidoId)
    .maybeSingle<PedidoRow>()

  if (error) throw falloAlGuardar(error)
  if (!data) throw rechazo(ENTREGA_PEDIDO_ERROR_MESSAGE, 'pedido_inexistente', 404)

  if (data.usuario_id !== usuarioId) {
    throw rechazo(ENTREGA_AJENO_ERROR_MESSAGE, 'ajeno', 403)
  }

  if (typeof data.forma_pago !== 'string' || data.forma_pago.trim().length === 0) {
    throw rechazo(ENTREGA_PAGO_ERROR_MESSAGE, 'sin_forma_pago', 422)
  }
}

async function exigirSinEntrega(pedidoId: number): Promise<void> {
  const { data, error } = await supabase
    .from('entrega')
    .select('id')
    .eq('pedido_id', pedidoId)
    .maybeSingle<{ id: number }>()

  if (error) throw falloAlGuardar(error)
  if (data) throw rechazo(ENTREGA_DUPLICADA_ERROR_MESSAGE, 'entrega_registrada', 409)
}

async function exigirMunicipio(departamentoId: number, municipioId: number): Promise<void> {
  const { data, error } = await supabase
    .from('municipio')
    .select('id, departamento_id')
    .eq('id', municipioId)
    .maybeSingle<MunicipioRow>()

  if (error) throw falloAlGuardar(error)
  if (!data || data.departamento_id !== departamentoId) {
    throw rechazo(
      'El municipio no pertenece al departamento indicado.',
      'datos_invalidos',
      400,
    )
  }
}

async function exigirSucursalActiva(sucursalId: number): Promise<void> {
  const { data, error } = await supabase
    .from('sucursal')
    .select('id, activa')
    .eq('id', sucursalId)
    .maybeSingle<SucursalRow>()

  if (error) throw falloAlGuardar(error)
  if (!data) {
    throw rechazo('La sucursal seleccionada no existe.', 'datos_invalidos', 400)
  }
  if (data.activa !== true) {
    throw rechazo(ENTREGA_SUCURSAL_INACTIVA_ERROR_MESSAGE, 'sucursal_inactiva', 422)
  }
}

function errorAlInsertar(error: DbError): EntregaError {
  const message = error?.message ?? ''
  if (error?.code === ENTREGA_UNICA_CODE) {
    return rechazo(ENTREGA_DUPLICADA_ERROR_MESSAGE, 'entrega_registrada', 409, error)
  }
  if (error?.code === TRIGGER_ERROR_CODE && /inactiva/i.test(message)) {
    return rechazo(ENTREGA_SUCURSAL_INACTIVA_ERROR_MESSAGE, 'sucursal_inactiva', 422, error)
  }
  if (error?.code === TRIGGER_ERROR_CODE && /forma de pago/i.test(message)) {
    return rechazo(ENTREGA_PAGO_ERROR_MESSAGE, 'sin_forma_pago', 422, error)
  }
  return falloAlGuardar(error)
}

function entregaDe(row: EntregaRow): EntregaRegistrada {
  return {
    id: row.id,
    pedidoId: row.pedido_id,
    tipo: row.tipo,
    departamentoId: row.departamento_id,
    municipioId: row.municipio_id,
    direccion: row.direccion,
    telefono: row.telefono,
    sucursalId: row.sucursal_id,
    fechaRegistro: row.fecha_registro,
  }
}

/**
 * Guarda la única entrega del pedido.
 * Una segunda petición simultánea choca con el único de pedido_id y
 * se responde como entrega ya registrada, sin crear otra fila.
 */
export async function registrarEntrega(
  pedidoId: number | string,
  input: RegistrarEntregaInput,
): Promise<EntregaRegistrada> {
  const usuarioId = await usuarioDeLaSesion()

  try {
    const id = idPositivo(pedidoId)
    if (id === null) {
      throw rechazo('El pedido no es válido.', 'datos_invalidos', 400)
    }
    if (input.tipo !== 'domicilio' && input.tipo !== 'sucursal') {
      throw rechazo(
        'Elige envío a domicilio o retiro en sucursal.',
        'datos_invalidos',
        400,
      )
    }

    await leerPedido(id, usuarioId)
    await exigirSinEntrega(id)

    const fila =
      input.tipo === 'domicilio'
        ? await filaDomicilio(id, input)
        : await filaSucursal(id, input)

    const { data, error } = await supabase
      .from('entrega')
      .insert(fila)
      .select(ENTREGA_COLUMNS)
      .single<EntregaRow>()

    if (error || !data) throw errorAlInsertar(error)
    return entregaDe(data)
  } catch (error) {
    if (error instanceof EntregaError) throw error
    throw falloAlGuardar(error)
  }
}

async function filaDomicilio(
  pedidoId: number,
  input: RegistrarEntregaInput,
): Promise<EntregaInsert> {
  const domicilio = validarDomicilio(input)
  await exigirMunicipio(domicilio.departamentoId, domicilio.municipioId)
  return {
    pedido_id: pedidoId,
    tipo: 'domicilio' as const,
    departamento_id: domicilio.departamentoId,
    municipio_id: domicilio.municipioId,
    direccion: domicilio.direccion,
    telefono: domicilio.telefono,
    sucursal_id: null,
  }
}

async function filaSucursal(
  pedidoId: number,
  input: RegistrarEntregaInput,
): Promise<EntregaInsert> {
  const sucursalId = validarSucursal(input)
  await exigirSucursalActiva(sucursalId)
  return {
    pedido_id: pedidoId,
    tipo: 'sucursal' as const,
    departamento_id: null,
    municipio_id: null,
    direccion: null,
    telefono: null,
    sucursal_id: sucursalId,
  }
}

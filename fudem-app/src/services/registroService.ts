import type { AuthError, Session } from '@supabase/supabase-js'
import { normalizePhone } from '../lib/fieldMasks'
import { supabase } from '../lib/supabase'

const USUARIO_TABLE = 'usuario'
const UNIQUE_VIOLATION_CODE = '23505'

export type NuevoUsuario = {
  dui: string
  nombre: string
  apellido: string
  fecha_nacimiento: string
  correo: string
  telefono: string
  contrasena: string
}

export type UsuarioProfilePayload = {
  id: string
  dui: string
  nombre: string
  apellido: string
  fecha_nacimiento: string
  correo: string
  telefono: string
  contrasena: string
  fecha_registro: string
}

export const REGISTRO_ERROR_MESSAGE =
  'No pudimos crear tu cuenta. Inténtalo de nuevo en unos momentos.'

export const REGISTRO_DUPLICADO_MESSAGE =
  'Ya existe una cuenta con ese DUI o correo.'

export const REGISTRO_RATE_LIMIT_MESSAGE =
  'Hay demasiados intentos de registro. Espera unos minutos e inicia sesión si ya creaste la cuenta.'

function todayAsDate(): string {
  return new Date().toLocaleDateString('en-CA')
}

export function messageFromSignupError(error: Pick<AuthError, 'message'> & { status?: number; code?: string }): string {
  const text = `${error.code ?? ''} ${error.message}`
  if (
    error.status === 429 ||
    /rate limit|too many requests|over_email_send_rate_limit/i.test(text)
  ) {
    return REGISTRO_RATE_LIMIT_MESSAGE
  }

  if (/already registered|already been registered|already exists/i.test(error.message)) {
    return REGISTRO_DUPLICADO_MESSAGE
  }

  return REGISTRO_ERROR_MESSAGE
}

export function buildSignupOptions(usuario: NuevoUsuario) {
  return {
    email: usuario.correo,
    password: usuario.contrasena,
    options: {
      data: {
        dui: usuario.dui,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        fecha_nacimiento: usuario.fecha_nacimiento,
        telefono: normalizePhone(usuario.telefono),
      },
    },
  }
}

export function buildUsuarioProfile(
  authUserId: string,
  usuario: NuevoUsuario,
): UsuarioProfilePayload {
  return {
    id: authUserId,
    dui: usuario.dui,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    fecha_nacimiento: usuario.fecha_nacimiento,
    correo: usuario.correo,
    telefono: normalizePhone(usuario.telefono),
    contrasena: '',
    fecha_registro: todayAsDate(),
  }
}

function isProfilePermissionError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42501' ||
    error.code === 'PGRST301' ||
    error.code === 'PGRST204' ||
    /jwt|not authorized|permission denied|unauthorized|column .* does not exist/i.test(
      error.message ?? '',
    )
  )
}

export async function registrarUsuario(
  usuario: NuevoUsuario,
): Promise<{ session: Session | null }> {
  const { data, error: signUpError } = await supabase.auth.signUp(
    buildSignupOptions(usuario),
  )

  if (signUpError) {
    throw new Error(messageFromSignupError(signUpError), { cause: signUpError })
  }

  if (data.user && data.user.identities && data.user.identities.length === 0) {
    throw new Error(REGISTRO_DUPLICADO_MESSAGE)
  }

  const session = data.session
  const authUserId = data.user?.id ?? session?.user.id

  if (!authUserId) {
    return { session: null }
  }

  if (!session) {
    return { session: null }
  }

  const { error } = await supabase.from(USUARIO_TABLE).upsert(
    buildUsuarioProfile(authUserId, usuario),
    { onConflict: 'id' },
  )

  if (error && error.code === UNIQUE_VIOLATION_CODE) {
    return { session }
  }

  if (error && !isProfilePermissionError(error)) {
    throw new Error(REGISTRO_ERROR_MESSAGE, { cause: error })
  }

  return { session }
}

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

function isProfilePermissionError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42501' ||
    error.code === 'PGRST301' ||
    /jwt|not authorized|permission denied|unauthorized/i.test(error.message ?? '')
  )
}

export async function registrarUsuario(
  usuario: NuevoUsuario,
): Promise<{ session: Session | null }> {
  const { data, error: signUpError } = await supabase.auth.signUp({
    email: usuario.correo,
    password: usuario.contrasena,
  })

  if (signUpError) {
    throw new Error(messageFromSignupError(signUpError), { cause: signUpError })
  }

  if (data.user && data.user.identities && data.user.identities.length === 0) {
    throw new Error(REGISTRO_DUPLICADO_MESSAGE)
  }

  const session = data.session

  if (!session) {
    return { session: null }
  }

  const { error } = await supabase.from(USUARIO_TABLE).insert({
    ...usuario,
    telefono: normalizePhone(usuario.telefono),
    fecha_registro: todayAsDate(),
  })

  if (error && error.code === UNIQUE_VIOLATION_CODE) {
    throw new Error(REGISTRO_DUPLICADO_MESSAGE, { cause: error })
  }

  if (error && !isProfilePermissionError(error)) {
    throw new Error(REGISTRO_ERROR_MESSAGE, { cause: error })
  }

  return { session }
}

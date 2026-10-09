import type { Session } from '@supabase/supabase-js'
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

function todayAsDate(): string {
  return new Date().toLocaleDateString('en-CA')
}

export async function registrarUsuario(
  usuario: NuevoUsuario,
): Promise<{ session: Session | null }> {
  const { data, error: signUpError } = await supabase.auth.signUp({
    email: usuario.correo,
    password: usuario.contrasena,
  })

  if (signUpError) {
    const duplicated =
      /already registered|already been registered|already exists/i.test(
        signUpError.message,
      )
    throw new Error(
      duplicated ? REGISTRO_DUPLICADO_MESSAGE : REGISTRO_ERROR_MESSAGE,
      { cause: signUpError },
    )
  }

  const { error } = await supabase.from(USUARIO_TABLE).insert({
    ...usuario,
    fecha_registro: todayAsDate(),
  })

  if (error) {
    const message =
      error.code === UNIQUE_VIOLATION_CODE
        ? REGISTRO_DUPLICADO_MESSAGE
        : REGISTRO_ERROR_MESSAGE
    throw new Error(message, { cause: error })
  }

  return { session: data.session }
}
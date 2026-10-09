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

export async function registrarUsuario(usuario: NuevoUsuario): Promise<void> {
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
}
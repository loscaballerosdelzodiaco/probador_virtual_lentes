import { supabase } from '../lib/supabase'

const USUARIO_TABLE = 'usuario'

export type NuevoUsuario = {
  dui: string
  nombre: string
  apellido: string
  fecha_nacimiento: string
  correo: string
  telefono: string
  contrasena: string
}

function todayAsDate(): string {
  return new Date().toLocaleDateString('en-CA')
}

export async function registrarUsuario(usuario: NuevoUsuario): Promise<void> {
  const { error } = await supabase.from(USUARIO_TABLE).insert({
    ...usuario,
    fecha_registro: todayAsDate(),
  })

  if (error) {
    throw new Error(`No se pudo registrar el usuario: ${error.message}`, {
      cause: error,
    })
  }
}
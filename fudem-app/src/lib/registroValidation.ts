import type { NuevoUsuario } from '../services/registroService'

export type RegistroErrors = Partial<Record<keyof NuevoUsuario, string>>

const DUI_REGEX = /^\d{8}-\d$/
const NAME_REGEX = /^[\p{L}][\p{L}\s'-]*$/u
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^(\+503\s?)?\d{4}-?\d{4}$/
const MIN_PASSWORD_LENGTH = 8
const MIN_BIRTH_DATE = '1900-01-01'

export function validateRegistro(
  usuario: NuevoUsuario,
  today: Date = new Date(),
): RegistroErrors {
  const errors: RegistroErrors = {}
  const todayAsDate = today.toLocaleDateString('en-CA')

  if (!usuario.dui) {
    errors.dui = 'DUI: este campo es obligatorio.'
  } else if (!DUI_REGEX.test(usuario.dui)) {
    errors.dui = 'DUI: usa el formato 00000000-0.'
  }

  if (!usuario.nombre) {
    errors.nombre = 'Nombre: este campo es obligatorio.'
  } else if (!NAME_REGEX.test(usuario.nombre)) {
    errors.nombre = 'Nombre: solo puede contener letras.'
  }

  if (!usuario.apellido) {
    errors.apellido = 'Apellido: este campo es obligatorio.'
  } else if (!NAME_REGEX.test(usuario.apellido)) {
    errors.apellido = 'Apellido: solo puede contener letras.'
  }

  if (!usuario.fecha_nacimiento) {
    errors.fecha_nacimiento = 'Fecha de nacimiento: este campo es obligatorio.'
  } else if (
    usuario.fecha_nacimiento < MIN_BIRTH_DATE ||
    usuario.fecha_nacimiento > todayAsDate
  ) {
    errors.fecha_nacimiento = 'Fecha de nacimiento: ingresa una fecha válida.'
  }

  if (!usuario.correo) {
    errors.correo = 'Correo: este campo es obligatorio.'
  } else if (!EMAIL_REGEX.test(usuario.correo)) {
    errors.correo = 'Correo: ingresa un correo válido, por ejemplo nombre@correo.com.'
  }

  if (!usuario.telefono) {
    errors.telefono = 'Teléfono: este campo es obligatorio.'
  } else if (!PHONE_REGEX.test(usuario.telefono)) {
    errors.telefono = 'Teléfono: usa 8 dígitos, por ejemplo 7000-0000.'
  }

  if (!usuario.contrasena) {
    errors.contrasena = 'Contraseña: este campo es obligatorio.'
  } else if (usuario.contrasena.length < MIN_PASSWORD_LENGTH) {
    errors.contrasena = `Contraseña: debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }

  return errors
}
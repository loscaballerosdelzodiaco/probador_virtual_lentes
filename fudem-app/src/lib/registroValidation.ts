import type { NuevoUsuario } from '../services/registroService'
import { phoneDigitCount } from './fieldMasks'

export type RegistroErrors = Partial<Record<keyof NuevoUsuario, string>>

const DUI_REGEX = /^\d{8}-\d$/
const NAME_REGEX = /^[\p{L}](?:[\p{L}\s'-]*[\p{L}])?$/u
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const MIN_BIRTH_DATE = '1900-01-01'
const MIN_PHONE_DIGITS = 8
const MAX_PHONE_DIGITS = 15

export function validateRegistro(
  usuario: NuevoUsuario,
  confirmacionContrasena?: string,
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
  } else if (!NAME_REGEX.test(usuario.nombre.trim())) {
    errors.nombre = 'Nombre: solo puede contener letras, espacios, tildes y ñ.'
  }

  if (!usuario.apellido) {
    errors.apellido = 'Apellido: este campo es obligatorio.'
  } else if (!NAME_REGEX.test(usuario.apellido.trim())) {
    errors.apellido = 'Apellido: solo puede contener letras, espacios, tildes y ñ.'
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
  } else {
    const digits = phoneDigitCount(usuario.telefono)
    const normalized = usuario.telefono.trim()
    const invalidChars = normalized.replace(/[\d+\s()-]/g, '')
    if (invalidChars.length > 0 || (normalized.includes('+') && !normalized.startsWith('+'))) {
      errors.telefono = 'Teléfono: elige un país e ingresa solo el número nacional.'
    } else if (digits < MIN_PHONE_DIGITS || digits > MAX_PHONE_DIGITS) {
      errors.telefono = 'Teléfono: ingresa el número completo según el país seleccionado.'
    }
  }

  if (!usuario.contrasena) {
    errors.contrasena = 'Contraseña: este campo es obligatorio.'
  } else if (usuario.contrasena.length < MIN_PASSWORD_LENGTH) {
    errors.contrasena = `Contraseña: debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  } else if (
    confirmacionContrasena !== undefined &&
    confirmacionContrasena !== usuario.contrasena
  ) {
    errors.contrasena = 'Contraseña: la confirmación no coincide.'
  }

  return errors
}

export function validateLogin(correo: string, contrasena: string): string[] {
  const messages: string[] = []
  if (!correo.trim()) {
    messages.push('Correo: este campo es obligatorio.')
  } else if (!EMAIL_REGEX.test(correo.trim())) {
    messages.push('Correo: ingresa un correo válido, por ejemplo nombre@correo.com.')
  }
  if (!contrasena) {
    messages.push('Contraseña: este campo es obligatorio.')
  }
  return messages
}

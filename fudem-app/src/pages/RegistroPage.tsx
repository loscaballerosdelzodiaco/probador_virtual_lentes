import { useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { maskDui, sanitizeName } from '../lib/fieldMasks'
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  composeInternationalPhone,
  flagEmoji,
  getPhoneCountry,
  maskNationalPhone,
  parsePhoneInput,
  phonePlaceholder,
} from '../lib/phoneCountries'
import { validateRegistro } from '../lib/registroValidation'
import {
  REGISTRO_ERROR_MESSAGE,
  registrarUsuario,
} from '../services/registroService'

type RegistroPageProps = {
  onRegisteredWithSession?: (session: Session) => void
}

export function RegistroPage({ onRegisteredWithSession }: RegistroPageProps) {
  const [errorMessages, setErrorMessages] = useState<string[]>([])
  const [isRegistered, setIsRegistered] = useState(false)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [dui, setDui] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [phoneCountry, setPhoneCountry] = useState(DEFAULT_PHONE_COUNTRY)
  const [telefono, setTelefono] = useState('')
  const selectedPhoneCountry = getPhoneCountry(phoneCountry)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const form = event.currentTarget
    const data = new FormData(form)
    const confirmacion = String(data.get('confirmacion_contrasena') ?? '')
    const usuario = {
      dui: dui.trim(),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      fecha_nacimiento: String(data.get('fecha_nacimiento') ?? '').trim(),
      correo: String(data.get('correo') ?? '').trim(),
      telefono: composeInternationalPhone(phoneCountry, telefono),
      contrasena: String(data.get('contrasena') ?? ''),
    }

    setIsRegistered(false)
    setNeedsLogin(false)

    const messages = Object.values(validateRegistro(usuario, confirmacion))
    if (messages.length > 0) {
      setErrorMessages(messages)
      return
    }
    setErrorMessages([])
    setIsSubmitting(true)

    try {
      const { session } = await registrarUsuario(usuario)
      setIsRegistered(true)
      form.reset()
      setDui('')
      setNombre('')
      setApellido('')
      setTelefono('')
      setPhoneCountry(DEFAULT_PHONE_COUNTRY)
      if (session) {
        onRegisteredWithSession?.(session)
      } else {
        setNeedsLogin(true)
      }
    } catch (error: unknown) {
      setErrorMessages([
        error instanceof Error ? error.message : REGISTRO_ERROR_MESSAGE,
      ])
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="registro" className="auth-screen">
      <div className="auth-screen__visual" aria-hidden="true">
        <div className="auth-screen__orb auth-screen__orb--one"></div>
        <div className="auth-screen__orb auth-screen__orb--two"></div>
        <p className="auth-screen__brand">FUDEM</p>
        <p className="auth-screen__tagline">
          Crea tu cuenta y explora aros pensadas para tu estilo.
        </p>
      </div>

      <div className="auth-screen__panel">
        <p className="auth-screen__kicker">Bienvenida</p>
        <h1>Crear cuenta</h1>
        <p>Completa tus datos para registrarte en la plataforma.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-form__field">
            <label htmlFor="registro-dui">DUI</label>
            <input
              id="registro-dui"
              name="dui"
              type="text"
              inputMode="numeric"
              placeholder="00000000-0"
              autoComplete="off"
              maxLength={10}
              value={dui}
              onChange={(event) => setDui(maskDui(event.target.value))}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="auth-form__row">
            <div className="auth-form__field">
              <label htmlFor="registro-nombre">Nombre</label>
              <input
                id="registro-nombre"
                name="nombre"
                type="text"
                autoComplete="given-name"
                value={nombre}
                onChange={(event) => setNombre(sanitizeName(event.target.value))}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="auth-form__field">
              <label htmlFor="registro-apellido">Apellido</label>
              <input
                id="registro-apellido"
                name="apellido"
                type="text"
                autoComplete="family-name"
                value={apellido}
                onChange={(event) =>
                  setApellido(sanitizeName(event.target.value))
                }
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="auth-form__field">
            <label htmlFor="registro-fecha-nacimiento">Fecha de nacimiento</label>
            <input
              id="registro-fecha-nacimiento"
              name="fecha_nacimiento"
              type="date"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="auth-form__field">
            <label htmlFor="registro-correo">Correo / Usuario</label>
            <input
              id="registro-correo"
              name="correo"
              type="email"
              autoComplete="email"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="auth-form__field">
            <label htmlFor="registro-telefono">Teléfono</label>
            <div className="auth-form__phone">
              <label className="visually-hidden" htmlFor="registro-pais">
                País
              </label>
              <select
                id="registro-pais"
                className="auth-form__country"
                value={phoneCountry}
                disabled={isSubmitting}
                onChange={(event) => {
                  const nextIso = event.target.value
                  setPhoneCountry(nextIso)
                  setTelefono(maskNationalPhone(telefono, nextIso))
                }}
              >
                {PHONE_COUNTRIES.map((country) => (
                  <option key={country.iso} value={country.iso}>
                    {flagEmoji(country.iso)} +{country.dial} {country.name}
                  </option>
                ))}
              </select>
              <input
                id="registro-telefono"
                name="telefono"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder={phonePlaceholder(selectedPhoneCountry)}
                value={telefono}
                onChange={(event) => {
                  const parsed = parsePhoneInput(event.target.value, phoneCountry)
                  setPhoneCountry(parsed.iso)
                  setTelefono(parsed.national)
                }}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="auth-form__field">
            <label htmlFor="registro-contrasena">Contraseña</label>
            <div className="auth-form__password">
              <input
                id="registro-contrasena"
                name="contrasena"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="auth-form__toggle"
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          <div className="auth-form__field">
            <label htmlFor="registro-confirmacion">Confirmar contraseña</label>
            <input
              id="registro-confirmacion"
              name="confirmacion_contrasena"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              disabled={isSubmitting}
            />
          </div>

          {errorMessages.length > 0 ? (
            <ul className="notice notice--error" role="alert">
              {errorMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}
          {isRegistered && !needsLogin ? (
            <p className="notice notice--success" role="status">
              Cuenta creada correctamente.
            </p>
          ) : null}
          {needsLogin ? (
            <p className="notice" role="status">
              Cuenta creada. Inicia sesión para acceder al catálogo.{' '}
              <a href="/login">Ir a iniciar sesión</a>
            </p>
          ) : null}

          <button
            type="submit"
            className="btn auth-form__submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registrando…' : 'Registrarse'}
          </button>
        </form>

        <p className="auth-screen__switch">
          ¿Ya tienes cuenta? <a href="/login">Iniciar sesión</a>
        </p>
      </div>
    </section>
  )
}

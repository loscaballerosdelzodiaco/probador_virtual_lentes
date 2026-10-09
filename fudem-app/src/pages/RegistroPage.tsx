import { useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const field = (name: string) => String(data.get(name) ?? '').trim()

    const usuario = {
      dui: field('dui'),
      nombre: field('nombre'),
      apellido: field('apellido'),
      fecha_nacimiento: field('fecha_nacimiento'),
      correo: field('correo'),
      telefono: field('telefono'),
      contrasena: String(data.get('contrasena') ?? ''),
    }

    setIsRegistered(false)
    setNeedsLogin(false)

    const messages = Object.values(validateRegistro(usuario))
    if (messages.length > 0) {
      setErrorMessages(messages)
      return
    }
    setErrorMessages([])

    try {
      const { session } = await registrarUsuario(usuario)
      setIsRegistered(true)
      form.reset()
      if (session) {
        onRegisteredWithSession?.(session)
      } else {
        setNeedsLogin(true)
      }
    } catch (error: unknown) {
      console.error(error)
      setErrorMessages([
        error instanceof Error ? error.message : REGISTRO_ERROR_MESSAGE,
      ])
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
              required
            />
          </div>

          <div className="auth-form__row">
            <div className="auth-form__field">
              <label htmlFor="registro-nombre">Nombre</label>
              <input
                id="registro-nombre"
                name="nombre"
                type="text"
                autoComplete="name"
                required
              />
            </div>
            <div className="auth-form__field">
              <label htmlFor="registro-apellido">Apellido</label>
              <input
                id="registro-apellido"
                name="apellido"
                type="text"
                autoComplete="family-name"
                required
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
            />
          </div>

          <div className="auth-form__field">
            <label htmlFor="registro-telefono">Teléfono</label>
            <input
              id="registro-telefono"
              name="telefono"
              type="tel"
              autoComplete="tel"
              required
            />
          </div>

          <div className="auth-form__field">
            <label htmlFor="registro-contrasena">Contraseña</label>
            <input
              id="registro-contrasena"
              name="contrasena"
              type="password"
              autoComplete="new-password"
              required
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
              Cuenta creada. Inicia sesión para acceder al catálogo.
            </p>
          ) : null}

          <button type="submit" className="btn auth-form__submit">
            Registrarse
          </button>
        </form>

        <p className="auth-screen__switch">
          ¿Ya tienes cuenta? <a href="/login">Iniciar sesión</a>
        </p>
      </div>
    </section>
  )
}

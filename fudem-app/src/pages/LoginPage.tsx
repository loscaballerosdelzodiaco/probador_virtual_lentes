import { useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { validateLogin } from '../lib/registroValidation'
import { LOGIN_ERROR_MESSAGE, signIn } from '../services/authService'

type LoginPageProps = {
  onLoggedIn?: (session: Session) => void
}

export function LoginPage({ onLoggedIn }: LoginPageProps) {
  const [errorMessages, setErrorMessages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const form = event.currentTarget
    const data = new FormData(form)
    const correo = String(data.get('correo') ?? '').trim()
    const contrasena = String(data.get('contrasena') ?? '')

    const messages = validateLogin(correo, contrasena)
    if (messages.length > 0) {
      setErrorMessages(messages)
      return
    }

    setErrorMessages([])
    setIsSubmitting(true)

    try {
      const session = await signIn(correo, contrasena)
      onLoggedIn?.(session)
    } catch (error: unknown) {
      setErrorMessages([
        error instanceof Error ? error.message : LOGIN_ERROR_MESSAGE,
      ])
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="login" className="auth-screen">
      <div className="auth-screen__visual" aria-hidden="true">
        <div className="auth-screen__orb auth-screen__orb--one"></div>
        <div className="auth-screen__orb auth-screen__orb--two"></div>
        <p className="auth-screen__brand">FUDEM</p>
        <p className="auth-screen__tagline">
          Atención visual accesible, con un catálogo para elegir montura con
          confianza.
        </p>
      </div>

      <div className="auth-screen__panel">
        <p className="auth-screen__kicker">Acceso</p>
        <h1>Iniciar sesión</h1>
        <p>Ingresa tu correo y contraseña para abrir el catálogo.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-form__field">
            <label htmlFor="login-correo">Correo</label>
            <input
              id="login-correo"
              name="correo"
              type="email"
              autoComplete="username"
              placeholder="nombre@correo.com"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="auth-form__field">
            <label htmlFor="login-contrasena">Contraseña</label>
            <div className="auth-form__password">
              <input
                id="login-contrasena"
                name="contrasena"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
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

          {errorMessages.length > 0 ? (
            <ul className="notice notice--error" role="alert">
              {errorMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}

          <button
            type="submit"
            className="btn auth-form__submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="auth-screen__switch">
          ¿Aún no tienes cuenta? <a href="/">Crear cuenta</a>
        </p>
      </div>
    </section>
  )
}

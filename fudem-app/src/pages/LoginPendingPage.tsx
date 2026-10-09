export function LoginPendingPage() {
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
        <p>
          El inicio de sesión estará disponible pronto. Hasta entonces, el
          catálogo solo se abre con una sesión real de Supabase.
        </p>

        <div className="auth-form">
          <div className="auth-form__field">
            <label htmlFor="login-correo">Correo</label>
            <input
              id="login-correo"
              type="email"
              autoComplete="username"
              disabled
              placeholder="nombre@correo.com"
            />
          </div>
          <div className="auth-form__field">
            <label htmlFor="login-contrasena">Contraseña</label>
            <input
              id="login-contrasena"
              type="password"
              autoComplete="current-password"
              disabled
              placeholder="••••••••"
            />
          </div>
          <button type="button" className="btn auth-form__submit" disabled>
            Próximamente
          </button>
        </div>

        <p className="auth-screen__switch">
          ¿Aún no tienes cuenta? <a href="/">Crear cuenta</a>
        </p>
      </div>
    </section>
  )
}

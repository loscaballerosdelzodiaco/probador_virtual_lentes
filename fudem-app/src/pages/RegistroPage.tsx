export function RegistroPage() {
    return (
      <section id="registro" className="section">
        <div className="container prose">
          <h1>Crear cuenta</h1>
          <p>Completa tus datos para registrarte en la plataforma.</p>
  
          <form>
            <p>
              <label htmlFor="registro-nombre">Nombre</label>
              <br />
              <input
                id="registro-nombre"
                name="nombre"
                type="text"
                autoComplete="name"
                required
              />
            </p>
  
            <p>
              <label htmlFor="registro-correo">Correo / Usuario</label>
              <br />
              <input
                id="registro-correo"
                name="correo"
                type="email"
                autoComplete="email"
                required
              />
            </p>
  
            <p>
              <label htmlFor="registro-contrasena">Contraseña</label>
              <br />
              <input
                id="registro-contrasena"
                name="contrasena"
                type="password"
                autoComplete="new-password"
                required
              />
            </p>
  
            <button type="submit" className="btn">
              Registrarse
            </button>
          </form>
  
          <p>
            ¿Ya tienes cuenta?{' '}
            <a className="btn btn--outline" href="#login">
              Iniciar sesión
            </a>
          </p>
        </div>
      </section>
    )
  }
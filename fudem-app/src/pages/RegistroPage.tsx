export function RegistroPage() {
    return (
      <section id="registro" className="section">
        <div className="container prose">
          <h1>Crear cuenta</h1>
          <p>Completa tus datos para registrarte en la plataforma.</p>
  
          <form>
            <p>
              <label htmlFor="registro-dui">DUI</label>
              <br />
              <input
                id="registro-dui"
                name="dui"
                type="text"
                inputMode="numeric"
                placeholder="00000000-0"
                required
              />
            </p>

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
              <label htmlFor="registro-apellido">Apellido</label>
              <br />
              <input
                id="registro-apellido"
                name="apellido"
                type="text"
                autoComplete="family-name"
                required
              />
            </p>

            <p>
              <label htmlFor="registro-fecha-nacimiento">Fecha de nacimiento</label>
              <br />
              <input
                id="registro-fecha-nacimiento"
                name="fecha_nacimiento"
                type="date"
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
              <label htmlFor="registro-telefono">Teléfono</label>
              <br />
              <input
                id="registro-telefono"
                name="telefono"
                type="tel"
                autoComplete="tel"
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
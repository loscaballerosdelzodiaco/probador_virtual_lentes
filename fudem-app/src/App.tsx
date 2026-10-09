import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  isCatalogRoute,
  readAppRoute,
  replaceLocation,
  type AppRoute,
} from './lib/appRoute'
import { CatalogPage } from './pages/CatalogPage'
import { LoginPage } from './pages/LoginPage'
import { RegistroPage } from './pages/RegistroPage'
import {
  SESSION_ERROR_MESSAGE,
  getCurrentSession,
  signOut,
  subscribeToAuthChanges,
} from './services/authService'
import './App.css'

function App() {
  const [route, setRoute] = useState<AppRoute>(() => readAppRoute())
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const syncRoute = () => setRoute(readAppRoute())
    window.addEventListener('popstate', syncRoute)
    window.addEventListener('hashchange', syncRoute)
    return () => {
      window.removeEventListener('popstate', syncRoute)
      window.removeEventListener('hashchange', syncRoute)
    }
  }, [])

  useEffect(() => {
    let active = true

    getCurrentSession()
      .then((current) => {
        if (!active) return
        setSession(current)
        setAuthError(null)
      })
      .catch((error: unknown) => {
        if (!active) return
        console.error(error)
        setSession(null)
        setAuthError(SESSION_ERROR_MESSAGE)
      })
      .finally(() => {
        if (active) setAuthLoading(false)
      })

    const unsubscribe = subscribeToAuthChanges((current) => {
      if (!active) return
      setSession(current)
      if (current) setAuthError(null)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (authLoading) return

    if ((!session || authError) && isCatalogRoute(route)) {
      replaceLocation('/login')
      return
    }

    if (session && !authError && (route.name === 'registro' || route.name === 'login')) {
      replaceLocation('/catalogo')
    }
  }, [authError, authLoading, route, session])

  async function handleSignOut() {
    try {
      await signOut()
      setSession(null)
      replaceLocation('/')
    } catch (error: unknown) {
      console.error(error)
      setSession(null)
      setAuthError(SESSION_ERROR_MESSAGE)
      replaceLocation('/')
    }
  }

  const canOpenCatalog = Boolean(session) && !authError && !authLoading

  return (
    <>
      <header className="site-header">
        <div className="site-header__row">
          <a href={canOpenCatalog ? '/catalogo' : '/'} className="site-logo">
            FUDEM
          </a>
          <nav className="nav" aria-label="Principal">
            <ul>
              <li className={!canOpenCatalog ? 'is-active' : undefined}>
                <a href="/" aria-current={!canOpenCatalog ? 'page' : undefined}>
                  Registro
                </a>
              </li>
              <li className={canOpenCatalog ? 'is-active' : undefined}>
                <a
                  href="/catalogo"
                  aria-current={canOpenCatalog ? 'page' : undefined}
                >
                  Catálogo
                </a>
              </li>
            </ul>
          </nav>
          {canOpenCatalog ? (
            <button type="button" className="btn btn--outline" onClick={() => void handleSignOut()}>
              Cerrar sesión
            </button>
          ) : (
            <a className="btn btn--flat" href="/login">
              Iniciar sesión
            </a>
          )}
        </div>
      </header>

      <main>
        {authLoading ? (
          <section className="section">
            <div className="container prose">
              <p role="status">Comprobando sesión…</p>
            </div>
          </section>
        ) : null}

        {!authLoading && authError ? (
          <section className="section">
            <div className="container prose">
              <p className="notice notice--error" role="alert">
                {authError}
              </p>
              <RegistroPage />
            </div>
          </section>
        ) : null}

        {!authLoading && !authError && !session && route.name === 'login' ? (
          <LoginPage
            onLoggedIn={(nextSession) => {
              setSession(nextSession)
              replaceLocation('/catalogo')
            }}
          />
        ) : null}

        {!authLoading && !authError && !session && route.name !== 'login' ? (
          <RegistroPage
            onRegisteredWithSession={(nextSession) => {
              setSession(nextSession)
              replaceLocation('/catalogo')
            }}
          />
        ) : null}

        {!authLoading && canOpenCatalog ? <CatalogPage /> : null}
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="grid-footer">
            <div>
              <h4>FUDEM</h4>
              <p>Atención visual accesible y un catálogo para probar aros con confianza.</p>
            </div>
            <div>
              <h4>Catálogo</h4>
              <p>
                <a href="/catalogo">Ver lentes</a>
              </p>
            </div>
            <div>
              <h4>Cuenta</h4>
              <p>
                <a href="/">Registrarse</a>
              </p>
            </div>
            <div>
              <h4>Ayuda</h4>
              <p>
                <a href="/login">Iniciar sesión</a>
              </p>
            </div>
            <div>
              <h4>Contacto</h4>
              <p>
                <a className="btn btn--cta" href="/">
                  Escribir
                </a>
              </p>
            </div>
          </div>
        </div>
        <div className="site-footer__bottom">
          <p>© {new Date().getFullYear()} FUDEM — Probador virtual de lentes</p>
        </div>
      </footer>
    </>
  )
}

export default App

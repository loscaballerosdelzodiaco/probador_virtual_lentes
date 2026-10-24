import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  isProtectedRoute,
  readAppRoute,
  replaceLocation,
  type AppRoute,
} from './lib/appRoute'
import { catalogImageSrc } from './lib/catalogImage'
import { CatalogPage } from './pages/CatalogPage'
import { LoginPage } from './pages/LoginPage'
import { PaymentPage, type ResumenItem } from './pages/PaymentPage'
import { RegistroPage } from './pages/RegistroPage'
import { getTryOnModels } from './lib/tryOn/tryOnService'
import type { TryOnModel } from './lib/tryOn/types'
import { TryOnPage } from './pages/TryOnPage'
import {
  SESSION_ERROR_MESSAGE,
  getCurrentSession,
  signOut,
  subscribeToAuthChanges,
} from './services/authService'
import {
  getAvailableProductById,
  type ProductoDisponible,
} from './services/productService'
import './App.css'

const PAYMENT_PRODUCT_ERROR_MESSAGE =
  'No pudimos cargar la montura. Inténtalo de nuevo en unos momentos.'

function toResumenItem(product: ProductoDisponible | null): ResumenItem | null {
  // Sin precio o con precio 0 no se puede pagar (RN1)
  if (!product || product.precio == null || product.precio <= 0) return null
  return {
    id: product.id,
    nombre: product.nombre?.trim() || 'Montura',
    precio: product.precio,
    imagenUrl: catalogImageSrc(product.url_imagen),
  }
}

type PaymentRouteProps = {
  productId: number | null
}

/**
 * HU5 / T10: carga el producto de /pago#<id> y abre la pantalla de pago.
 * Temporal: se reemplaza por PaymentPage con productId cuando llegue la T4.
 */
function PaymentRoute({ productId }: PaymentRouteProps) {
  const [item, setItem] = useState<ResumenItem | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable' | 'error'>(
    productId === null ? 'unavailable' : 'loading',
  )

  useEffect(() => {
    if (productId === null) return

    let active = true
    getAvailableProductById(productId)
      .then((product) => {
        if (!active) return
        const next = toResumenItem(product)
        setItem(next)
        setStatus(next ? 'ready' : 'unavailable')
      })
      .catch((error: unknown) => {
        if (!active) return
        console.error(error)
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [productId])

  if (status === 'ready' && item) return <PaymentPage items={[item]} />

  return (
    <section className="section">
      <div className="row">
        {status === 'loading' ? <p role="status">Cargando montura…</p> : null}
        {status === 'error' ? (
          <p className="notice notice--error" role="alert">
            {PAYMENT_PRODUCT_ERROR_MESSAGE} <a href="/catalogo">Volver al catálogo</a>
          </p>
        ) : null}
        {status === 'unavailable' ? (
          <p className="notice" role="status">
            No encontramos esta montura disponible para comprar.{' '}
            <a href="/catalogo">Volver al catálogo</a>
          </p>
        ) : null}
      </div>
    </section>
  )
}

function App() {
  const [route, setRoute] = useState<AppRoute>(() => readAppRoute())
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [tryOnModels, setTryOnModels] = useState<TryOnModel[]>([])

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

    if ((!session || authError) && isProtectedRoute(route)) {
      replaceLocation('/login')
      return
    }

    if (session && !authError && (route.name === 'registro' || route.name === 'login')) {
      replaceLocation('/catalogo')
    }
  }, [authError, authLoading, route, session])

  const canOpenCatalog = Boolean(session) && !authError && !authLoading

  useEffect(() => {
    if (!canOpenCatalog || route.name !== 'probador') return

    let active = true
    getTryOnModels()
      .then((rows) => {
        if (!active) return
        setTryOnModels(rows)
      })
      .catch((error: unknown) => {
        if (!active) return
        console.error(error)
        setTryOnModels([])
      })

    return () => {
      active = false
    }
  }, [canOpenCatalog, route.name])

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

        {!authLoading && canOpenCatalog && route.name === 'probador' ? (
          <TryOnPage productId={route.productId} models={tryOnModels} />
        ) : null}

        {!authLoading && canOpenCatalog && route.name === 'pago' ? (
          <PaymentRoute key={route.productId ?? 'sin-id'} productId={route.productId} />
        ) : null}

        {!authLoading &&
        canOpenCatalog &&
        route.name !== 'probador' &&
        route.name !== 'pago' ? (
          <CatalogPage />
        ) : null}
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="grid-footer">
            <div className="site-footer__brand">
              <h4>FUDEM</h4>
              <p>Atención visual accesible y un catálogo para probar aros con confianza.</p>
            </div>
            <nav className="site-footer__nav" aria-label="Pie de página">
              <div>
                <h4>Catálogo</h4>
                <a href="/catalogo">Ver lentes</a>
              </div>
              <div>
                <h4>Cuenta</h4>
                <a href="/">Registrarse</a>
              </div>
              <div>
                <h4>Ayuda</h4>
                <a href="/login">Iniciar sesión</a>
              </div>
            </nav>
            <div className="site-footer__contact">
              <h4>Contacto</h4>
              <a className="btn btn--cta" href="/">
                Escribir
              </a>
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

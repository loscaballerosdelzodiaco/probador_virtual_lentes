<<<<<<< HEAD
import { useMemo, useState } from 'react'
import { ProductCard } from './components/ProductCard'
import { products, type Product } from './data/products'
=======
import { useEffect, useMemo, useState } from 'react'
import { type Product } from './data/products'
import {
  getAvailableProducts,
  type ProductoDisponible,
} from './services/productService'
>>>>>>> fe4aab6470cdf8e6b961cb06d9b5672684fcfbd4
import './App.css'

const PAGE_SIZE = 6

function sortProducts(list: Product[], order: string) {
  const sorted = [...list]
  if (order === 'price-asc') {
    sorted.sort((a, b) => a.price - b.price)
  } else if (order === 'price-desc') {
    sorted.sort((a, b) => b.price - a.price)
  } else if (order === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }
  return sorted
}

function catalogImageSrc(fileName: string | null): string {
  const name = fileName?.split(/[/\\]/).pop()?.trim()
  return name ? `/catalog/${name}` : '/catalog/aviador.svg'
}

function toCatalogProduct(product: ProductoDisponible): Product {
  return {
    id: String(product.id),
    name: product.nombre ?? 'Sin nombre',
    price: product.precio ?? 0,
    image: catalogImageSrc(product.url_imagen),
  }
}

function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [order, setOrder] = useState('menu_order')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let active = true

    getAvailableProducts()
      .then((rows) => {
        if (!active) return
        setProducts(rows.map(toCatalogProduct))
        setLoadError(null)
      })
      .catch((error: unknown) => {
        if (!active) return
        setProducts([])
        setLoadError(
          error instanceof Error
            ? error.message
            : 'No se pudieron consultar los productos disponibles.',
        )
      })

    return () => {
      active = false
    }
  }, [])

  const filteredProducts = useMemo(() => {
    if (filter === 'sale') {
      return products.filter((product) => product.onSale)
    }
    if (filter === 'available') {
      return products.filter((product) => !product.outOfStock)
    }
    return products
  }, [filter, products])

  const orderedProducts = useMemo(
    () => sortProducts(filteredProducts, order),
    [filteredProducts, order],
  )
  const pageCount = Math.max(1, Math.ceil(orderedProducts.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageItems = orderedProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )
  const rangeStart = orderedProducts.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, orderedProducts.length)

  return (
    <>
      <header className="site-header">
        <div className="site-header__row">
          <a href="#catalogo" className="site-logo">
            FUDEM
          </a>
          <nav className="nav" aria-label="Principal">
            <ul>
              <li>
                <a href="#catalogo">Inicio</a>
              </li>
              <li className="is-active">
                <a href="#catalogo" aria-current="page">
                  Catálogo
                </a>
              </li>
              <li>
                <a href="#catalogo">Probador virtual</a>
              </li>
            </ul>
          </nav>
          <a className="btn btn--flat" href="#catalogo">
            Agendar cita
          </a>
        </div>
      </header>

      <main>
        <section id="catalogo" className="section">
          <div className="row">
            <nav className="breadcrumb" aria-label="Miga de pan">
              <a href="#catalogo">Inicio</a> / Catálogo
            </nav>
            <h1>Catálogo de lentes</h1>
            <p>
              Explora monturas disponibles y elige el modelo que mejor se adapte a
              tu estilo. El probador virtual se integrará en un siguiente paso.
            </p>
            {loadError ? <p role="alert">{loadError}</p> : null}

            <div className="catalog-filters">
              <button
                type="button"
                className={filter === 'all' ? 'btn--filter is-active' : 'btn--filter'}
                onClick={() => {
                  setFilter('all')
                  setPage(1)
                }}
              >
                Todos
              </button>
              <button
                type="button"
                className={filter === 'sale' ? 'btn--filter is-active' : 'btn--filter'}
                onClick={() => {
                  setFilter('sale')
                  setPage(1)
                }}
              >
                Ofertas
              </button>
              <button
                type="button"
                className={filter === 'available' ? 'btn--filter is-active' : 'btn--filter'}
                onClick={() => {
                  setFilter('available')
                  setPage(1)
                }}
              >
                Disponibles
              </button>
            </div>

            <div className="catalog-toolbar">
              <p className="result-count">
                Mostrando {rangeStart}–{rangeEnd} de {orderedProducts.length} resultados
              </p>
              <label>
                Ordenar
                <select
                  className="select-order"
                  value={order}
                  onChange={(event) => {
                    setOrder(event.target.value)
                    setPage(1)
                  }}
                >
                  <option value="menu_order">Orden predeterminado</option>
                  <option value="price-asc">Precio: menor a mayor</option>
                  <option value="price-desc">Precio: mayor a menor</option>
                  <option value="name">Nombre</option>
                </select>
              </label>
            </div>

            <ul className="grid-products">
              {pageItems.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ul>

            <nav className="pagination" aria-label="Paginación">
              <ul>
                {Array.from({ length: pageCount }, (_, index) => {
                  const pageNumber = index + 1
                  const isCurrent = pageNumber === currentPage
                  return (
                    <li key={pageNumber}>
                      {isCurrent ? (
                        <span className="is-current" aria-current="page">
                          {pageNumber}
                        </span>
                      ) : (
                        <a
                          href="#catalogo"
                          onClick={(event) => {
                            event.preventDefault()
                            setPage(pageNumber)
                          }}
                        >
                          {pageNumber}
                        </a>
                      )}
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="grid-footer">
            <div>
              <h4>FUDEM</h4>
              <p>Atención visual accesible y un catálogo para probar monturas con confianza.</p>
            </div>
            <div>
              <h4>Catálogo</h4>
              <p>
                <a href="#catalogo">Ver lentes</a>
              </p>
            </div>
            <div>
              <h4>Clínica</h4>
              <p>
                <a href="#catalogo">Agendar cita</a>
              </p>
            </div>
            <div>
              <h4>Ayuda</h4>
              <p>
                <a href="#catalogo">Preguntas frecuentes</a>
              </p>
            </div>
            <div>
              <h4>Contacto</h4>
              <p>
                <a className="btn btn--cta" href="#catalogo">
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

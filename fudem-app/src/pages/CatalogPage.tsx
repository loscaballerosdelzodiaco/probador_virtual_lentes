import { useEffect, useMemo, useState } from 'react'
import { ProductCard } from '../components/ProductCard'
import { type Product } from '../data/products'
import { catalogImageSrc } from '../lib/catalogImage'
import { productIdFromHash } from '../lib/appRoute'
import {
  matchesCategoryFilter,
  type CategoryFilter,
} from '../lib/categoryFilter'
import { ProductDetailPage } from './ProductDetailPage'
import {
  CATALOG_LOAD_ERROR_MESSAGE,
  getAvailableProducts,
  type ProductoDisponible,
} from '../services/productService'

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

function toCatalogProduct(product: ProductoDisponible): Product {
  return {
    id: String(product.id),
    name: product.nombre ?? 'Sin nombre',
    price: product.precio ?? 0,
    image: catalogImageSrc(product.url_imagen),
    category: product.categoria,
  }
}

export function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [order, setOrder] = useState('menu_order')
  const [page, setPage] = useState(1)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(() =>
    productIdFromHash(window.location.hash),
  )

  useEffect(() => {
    const onHashChange = () => {
      setSelectedProductId(productIdFromHash(window.location.hash))
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

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
        console.error(error)
        setProducts([])
        setLoadError(CATALOG_LOAD_ERROR_MESSAGE)
      })
      .finally(() => {
        if (!active) return
        setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        matchesCategoryFilter(product.category, filter),
      ),
    [filter, products],
  )

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

  if (selectedProductId) {
    return <ProductDetailPage productId={selectedProductId} />
  }

  return (
    <section id="catalogo" className="section">
      <div className="row">
        <nav className="breadcrumb" aria-label="Miga de pan">
          <a href="/catalogo">Inicio</a> / Catálogo
        </nav>
        <h1>Catálogo de lentes</h1>
        <p>
          Explora aros disponibles y elige el modelo que mejor se adapte a
          tu estilo. El probador virtual se integrará en un siguiente paso.
        </p>
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
            className={filter === 'hombre' ? 'btn--filter is-active' : 'btn--filter'}
            onClick={() => {
              setFilter('hombre')
              setPage(1)
            }}
          >
            Hombre
          </button>
          <button
            type="button"
            className={filter === 'mujer' ? 'btn--filter is-active' : 'btn--filter'}
            onClick={() => {
              setFilter('mujer')
              setPage(1)
            }}
          >
            Mujer
          </button>
        </div>

        {isLoading ? <p role="status">Cargando productos…</p> : null}
        {loadError ? (
          <p className="notice notice--error" role="alert">
            {loadError}
          </p>
        ) : null}

        {!isLoading && !loadError ? (
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
        ) : null}

        {!isLoading && !loadError && products.length === 0 ? (
          <p className="notice" role="status">
            Actualmente no hay productos disponibles.
          </p>
        ) : null}

        {!isLoading &&
        !loadError &&
        products.length > 0 &&
        orderedProducts.length === 0 ? (
          <p className="notice" role="status">
            No hay aros en esta categoría.
          </p>
        ) : null}

        {orderedProducts.length > 0 ? (
          <>
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
                          href="/catalogo"
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
          </>
        ) : null}
      </div>
    </section>
  )
}

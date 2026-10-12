import { useEffect, useState } from 'react'
import { ProductDetail } from '../components/ProductDetail'
import {
  getAvailableProductById,
  type ProductoDisponible,
} from '../services/productService'

type ProductDetailPageProps = {
  productId: number
}

export function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const [product, setProduct] = useState<ProductoDisponible | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadedProductId, setLoadedProductId] = useState<number | null>(null)

  useEffect(() => {
    let active = true

    getAvailableProductById(productId)
      .then((row) => {
        if (!active) return
        setProduct(row)
        setLoadError(null)
        setLoadedProductId(productId)
      })
      .catch((error: unknown) => {
        if (!active) return
        setProduct(null)
        setLoadError(
          error instanceof Error
            ? error.message
            : 'No se pudo consultar el producto.',
        )
        setLoadedProductId(productId)
      })

    return () => {
      active = false
    }
  }, [productId])

  const isLoading = loadedProductId !== productId
  const visibleProduct = isLoading ? null : product
  const visibleError = isLoading ? null : loadError

  const title = visibleProduct?.nombre?.trim() || 'Montura'

  return (
    <section id="detalle" className="section">
      <div className="row">
        <nav className="breadcrumb" aria-label="Miga de pan">
          <a href="/catalogo">Inicio</a> / <a href="/catalogo">Catálogo</a> /{' '}
          {title}
        </nav>

        {isLoading ? <p>Cargando montura…</p> : null}
        {visibleError ? (
          <p className="notice notice--error" role="alert">
            {visibleError}
          </p>
        ) : null}
        {!isLoading && !visibleError && !visibleProduct ? (
          <p className="notice" role="status">
            No encontramos esta montura disponible.{' '}
            <a href="/catalogo">Volver al catálogo</a>
          </p>
        ) : null}
        {visibleProduct ? <ProductDetail product={visibleProduct} /> : null}
      </div>
    </section>
  )
}

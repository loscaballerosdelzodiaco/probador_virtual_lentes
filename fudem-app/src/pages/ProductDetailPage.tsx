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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    setIsLoading(true)

    getAvailableProductById(productId)
      .then((row) => {
        if (!active) return
        setProduct(row)
        setLoadError(null)
      })
      .catch((error: unknown) => {
        if (!active) return
        setProduct(null)
        setLoadError(
          error instanceof Error
            ? error.message
            : 'No se pudo consultar el producto.',
        )
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [productId])

  const title = product?.nombre?.trim() || 'Montura'

  return (
    <section id="detalle" className="section">
      <div className="row">
        <nav className="breadcrumb" aria-label="Miga de pan">
          <a href="#catalogo">Inicio</a> / <a href="#catalogo">Catálogo</a> /{' '}
          {title}
        </nav>

        {isLoading ? <p>Cargando montura…</p> : null}
        {loadError ? (
          <p className="notice notice--error" role="alert">
            {loadError}
          </p>
        ) : null}
        {!isLoading && !loadError && !product ? (
          <p className="notice" role="status">
            No encontramos esta montura disponible.{' '}
            <a href="#catalogo">Volver al catálogo</a>
          </p>
        ) : null}
        {product ? <ProductDetail product={product} /> : null}
      </div>
    </section>
  )
}

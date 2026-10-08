import { catalogImageSrc } from '../lib/catalogImage'
import type { ProductoDisponible } from '../services/productService'

type ProductDetailProps = {
  product: ProductoDisponible
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function visibleText(value: string | null): string | null {
  const text = value?.trim()
  return text ? text : null
}

export function ProductDetail({ product }: ProductDetailProps) {
  const name = visibleText(product.nombre)
  const sku = visibleText(product.sku)
  const material = visibleText(product.material)
  const color = visibleText(product.color)
  const medidas = visibleText(product.medidas)
  const categoria = visibleText(product.categoria)
  const specs = [
    sku ? ['SKU', sku] : null,
    material ? ['Material', material] : null,
    color ? ['Color', color] : null,
    medidas ? ['Medidas', medidas] : null,
    categoria ? ['Categoría', categoria] : null,
  ].filter((row): row is [string, string] => row !== null)

  return (
    <article className="product-detail">
      <div className="product-detail__media card">
        <div className="card__media">
          <img
            src={catalogImageSrc(product.url_imagen)}
            alt={name ?? ''}
          />
        </div>
      </div>

      <div className="product-detail__info">
        {name ? <h1 className="product-detail__name">{name}</h1> : null}
        {product.precio != null ? (
          <p className="product-detail__price">{formatPrice(product.precio)}</p>
        ) : null}

        {specs.length > 0 ? (
          <dl className="product-detail__specs">
            {specs.map(([label, value]) => (
              <div key={label} className="product-detail__spec">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </article>
  )
}

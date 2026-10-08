import type { Product } from '../data/products'

type ProductCardProps = {
  product: Product
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export function ProductCard({ product }: ProductCardProps) {
  const href = `#${product.id}`
  const cardClassName = product.outOfStock ? 'card card--out-of-stock' : 'card'

  return (
    <li className={cardClassName}>
      {product.onSale ? <span className="badge">Oferta</span> : null}
      <a className="card__media" href={href}>
        <img src={product.image} alt={product.name} />
      </a>
      <h2 className="card__title">
        <a href={href}>{product.name}</a>
      </h2>
      <p className="card__price">
        {product.compareAt ? <del>{formatPrice(product.compareAt)}</del> : null}
        {formatPrice(product.price)}
      </p>
      {product.outOfStock ? (
        <span className="btn-loop" aria-disabled="true">
          Agotado
        </span>
      ) : (
        <a className="btn-loop" href={href}>
          Ver montura
        </a>
      )}
    </li>
  )
}

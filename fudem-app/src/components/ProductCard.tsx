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

  return (
    <li className="card">
      <a className="card__media" href={href}>
        <img src={product.image} alt={product.name} />
      </a>
      <h2 className="card__title">
        <a href={href}>{product.name}</a>
      </h2>
      <p className="card__price">
        {formatPrice(product.price)}
      </p>
      <a className="btn-loop" href={href}>
        Ver aro
      </a>
    </li>
  )
}

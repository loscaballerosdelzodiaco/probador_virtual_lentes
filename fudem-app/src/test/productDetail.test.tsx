import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProductDetail } from '../components/ProductDetail'
import type { ProductoDisponible } from '../services/productService'

const product: ProductoDisponible = {
  id: 15,
  nombre: 'AN7225',
  precio: 80,
  sku: 'ARNETTEAN7225',
  material: 'Acetato',
  color: 'Negro',
  medidas: null,
  categoria: 'Hombre',
  url_imagen: 'ARNETTEAN7225.webp',
  disponible: true,
}

describe('ProductDetail', () => {
  it('enlaza Probar virtualmente con /probador#<id>', () => {
    render(<ProductDetail product={product} />)

    expect(screen.getByRole('link', { name: 'Probar virtualmente' })).toHaveAttribute(
      'href',
      '/probador#15',
    )
  })

  it('enlaza Comprar con /pago#<id> (T10)', () => {
    render(<ProductDetail product={product} />)

    expect(screen.getByRole('link', { name: 'Comprar' })).toHaveAttribute(
      'href',
      '/pago#15',
    )
  })

  it('no muestra Comprar si la montura no tiene precio o vale 0 (RN1)', () => {
    const { rerender } = render(<ProductDetail product={{ ...product, precio: null }} />)
    expect(screen.queryByRole('link', { name: 'Comprar' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Probar virtualmente' })).toBeInTheDocument()

    rerender(<ProductDetail product={{ ...product, precio: 0 }} />)
    expect(screen.queryByRole('link', { name: 'Comprar' })).not.toBeInTheDocument()
  })

  it('muestra un solo botón Comprar', () => {
    render(<ProductDetail product={product} />)

    expect(screen.getAllByRole('link', { name: 'Comprar' })).toHaveLength(1)
  })
})

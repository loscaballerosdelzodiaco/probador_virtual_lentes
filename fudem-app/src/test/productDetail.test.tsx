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
})

import { describe, expect, it } from 'vitest'
import { catalogImageSrc } from '../lib/catalogImage'

describe('catalogImageSrc', () => {
  it('usa el nombre de archivo dentro de /catalog', () => {
    expect(catalogImageSrc('ARNETTEAN7225.webp')).toBe(
      '/catalog/ARNETTEAN7225.webp',
    )
    expect(catalogImageSrc('folder/AIRFORCEAFV116.webp')).toBe(
      '/catalog/AIRFORCEAFV116.webp',
    )
  })

  it('usa el placeholder cuando no hay imagen', () => {
    expect(catalogImageSrc(null)).toBe('/catalog/aviador.svg')
    expect(catalogImageSrc('   ')).toBe('/catalog/aviador.svg')
  })
})

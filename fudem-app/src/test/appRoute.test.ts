import { describe, expect, it } from 'vitest'
import { isCatalogRoute, productIdFromHash, readAppRoute } from '../lib/appRoute'

describe('readAppRoute', () => {
  it('resuelve registro como ruta por defecto', () => {
    expect(readAppRoute('/', '')).toEqual({ name: 'registro' })
    expect(readAppRoute('/otra', '')).toEqual({ name: 'registro' })
  })

  it('resuelve login por path o hash', () => {
    expect(readAppRoute('/login', '')).toEqual({ name: 'login' })
    expect(readAppRoute('/', '#login')).toEqual({ name: 'login' })
  })

  it('resuelve catálogo y el id de producto del hash', () => {
    expect(readAppRoute('/catalogo', '')).toEqual({
      name: 'catalogo',
      productId: null,
    })
    expect(readAppRoute('/', '#catalogo')).toEqual({
      name: 'catalogo',
      productId: null,
    })
    expect(readAppRoute('/catalogo', '#12')).toEqual({
      name: 'catalogo',
      productId: 12,
    })
  })
})

describe('productIdFromHash e isCatalogRoute', () => {
  it('ignora hashes vacíos o no numéricos', () => {
    expect(productIdFromHash('')).toBeNull()
    expect(productIdFromHash('#catalogo')).toBeNull()
    expect(productIdFromHash('#0')).toBeNull()
    expect(productIdFromHash('#abc')).toBeNull()
    expect(productIdFromHash('#7')).toBe(7)
  })

  it('distingue la ruta de catálogo', () => {
    expect(isCatalogRoute({ name: 'catalogo', productId: null })).toBe(true)
    expect(isCatalogRoute({ name: 'login' })).toBe(false)
    expect(isCatalogRoute({ name: 'registro' })).toBe(false)
  })
})

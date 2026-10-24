import { describe, expect, it } from 'vitest'
import {
  isProtectedRoute,
  productIdFromHash,
  readAppRoute,
} from '../lib/appRoute'

describe('readAppRoute', () => {
  it('interpreta /probador#<id> con el identificador del producto', () => {
    expect(readAppRoute('/probador', '#12')).toEqual({
      name: 'probador',
      productId: 12,
    })
    expect(productIdFromHash('#12')).toBe(12)
  })

  it('deja el probador sin producto si el hash no trae un id válido', () => {
    expect(readAppRoute('/probador', '')).toEqual({
      name: 'probador',
      productId: null,
    })
    expect(readAppRoute('/probador', '#probador')).toEqual({
      name: 'probador',
      productId: null,
    })
    expect(readAppRoute('/probador', '#0')).toEqual({
      name: 'probador',
      productId: null,
    })
  })

  it('mantiene las rutas de catálogo, login y registro', () => {
    expect(readAppRoute('/catalogo', '#8')).toEqual({
      name: 'catalogo',
      productId: 8,
    })
    expect(readAppRoute('/catalogo', '')).toEqual({
      name: 'catalogo',
      productId: null,
    })
    expect(readAppRoute('/login', '')).toEqual({ name: 'login' })
    expect(readAppRoute('/documentos', '')).toEqual({ name: 'documentos' })
    expect(readAppRoute('/', '')).toEqual({ name: 'registro' })
  })

  it('interpreta /pago#<id> con el identificador del producto (T10)', () => {
    expect(readAppRoute('/pago', '#5')).toEqual({ name: 'pago', productId: 5 })
    expect(readAppRoute('/pago/', '#5')).toEqual({ name: 'pago', productId: 5 })
    expect(readAppRoute('/pago', '')).toEqual({ name: 'pago', productId: null })
    expect(readAppRoute('/pago', '#abc')).toEqual({ name: 'pago', productId: null })
    expect(readAppRoute('/', '#pago')).toEqual({ name: 'pago', productId: null })
    expect(productIdFromHash('#pago')).toBeNull()
  })

  it('protege catálogo, probador y pago, y deja libre el registro', () => {
    expect(isProtectedRoute({ name: 'pago', productId: 5 })).toBe(true)
    expect(isProtectedRoute({ name: 'probador', productId: 3 })).toBe(true)
    expect(isProtectedRoute({ name: 'catalogo', productId: null })).toBe(true)
    expect(isProtectedRoute({ name: 'documentos' })).toBe(true)
    expect(isProtectedRoute({ name: 'registro' })).toBe(false)
    expect(isProtectedRoute({ name: 'login' })).toBe(false)
  })
})

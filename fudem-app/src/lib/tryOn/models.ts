import { brandFromCatalogFile, catalogImageSrc, tryOnImageSrc } from '../catalogImage'
import type { ProductoDisponible } from '../../services/productService'
import type { TryOnModel } from './types'

export function toTryOnModel(product: ProductoDisponible): TryOnModel | null {
  const overlayUrl = tryOnImageSrc(product.url_imagen)
  if (!overlayUrl) return null
  return {
    id: product.id,
    nombre: product.nombre?.trim() || 'Sin nombre',
    marca: brandFromCatalogFile(product.url_imagen),
    imageUrl: catalogImageSrc(product.url_imagen),
    overlayUrl,
  }
}

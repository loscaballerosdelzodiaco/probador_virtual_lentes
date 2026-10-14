import { brandFromCatalogFile, catalogImageSrc } from '../catalogImage'
import type { ProductoDisponible } from '../../services/productService'
import type { TryOnModel } from './types'

export function toTryOnModel(product: ProductoDisponible): TryOnModel {
  return {
    id: product.id,
    nombre: product.nombre?.trim() || 'Sin nombre',
    marca: brandFromCatalogFile(product.url_imagen),
    imageUrl: catalogImageSrc(product.url_imagen),
  }
}

import {
  CATALOG_LOAD_ERROR_MESSAGE,
  getAvailableProductById,
  getAvailableProducts,
} from '../../services/productService'
import type { ProductoDisponible } from '../../services/productService'
import { toTryOnModel } from './models'
import type { TryOnModel } from './types'

export { CATALOG_LOAD_ERROR_MESSAGE }
export type { TryOnModel }

function hasValidCatalogImage(urlImagen: string | null): boolean {
  return Boolean(urlImagen?.split(/[/\\]/).pop()?.trim())
}

function toUsableTryOnModel(product: ProductoDisponible): TryOnModel | null {
  if (!product.disponible || !hasValidCatalogImage(product.url_imagen)) {
    return null
  }
  return toTryOnModel(product)
}

export async function getTryOnModels(): Promise<TryOnModel[]> {
  const products = await getAvailableProducts()
  return products.flatMap((product) => {
    const model = toUsableTryOnModel(product)
    return model ? [model] : []
  })
}

export async function getTryOnModelById(id: number): Promise<TryOnModel | null> {
  const product = await getAvailableProductById(id)
  if (!product) return null
  return toUsableTryOnModel(product)
}

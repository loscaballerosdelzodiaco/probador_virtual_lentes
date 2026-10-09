import { supabase } from '../lib/supabase'

export type ProductoDisponible = {
  id: number
  nombre: string | null
  precio: number | null
  sku: string | null
  material: string | null
  color: string | null
  medidas: string | null
  categoria: string | null
  url_imagen: string | null
  disponible: boolean
}

const PRODUCT_COLUMNS =
  'id, nombre, precio, sku, material, color, medidas, categoria, url_imagen, disponible'

export const CATALOG_LOAD_ERROR_MESSAGE =
  'No pudimos cargar el catálogo. Inténtalo de nuevo en unos momentos.'

export async function getAvailableProducts(): Promise<ProductoDisponible[]> {
  const { data, error } = await supabase
    .from('producto')
    .select(PRODUCT_COLUMNS)
    .eq('disponible', true)
    .returns<ProductoDisponible[]>()

  if (error) {
    throw new Error(CATALOG_LOAD_ERROR_MESSAGE, { cause: error })
  }

  return data ?? []
}

export async function getAvailableProductById(
  id: number,
): Promise<ProductoDisponible | null> {
  const { data, error } = await supabase
    .from('producto')
    .select(PRODUCT_COLUMNS)
    .eq('id', id)
    .eq('disponible', true)
    .returns<ProductoDisponible>()
    .maybeSingle()

  if (error) {
    throw new Error(`No se pudo consultar el producto: ${error.message}`)
  }

  return data
}

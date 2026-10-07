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

export async function getAvailableProducts(): Promise<ProductoDisponible[]> {
  const { data, error } = await supabase
    .from('producto')
    .select(PRODUCT_COLUMNS)
    .eq('disponible', true)
    .returns<ProductoDisponible[]>()

  if (error) {
    throw new Error(
      `No se pudieron consultar los productos disponibles: ${error.message}`,
    )
  }

  return data ?? []
}

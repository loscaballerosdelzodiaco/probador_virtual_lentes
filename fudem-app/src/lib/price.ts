/** Deuda / T7: único formato del precio en dólares (catálogo, detalle, pago y devoluciones). */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

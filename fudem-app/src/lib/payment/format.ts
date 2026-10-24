/** HU5 / T4: precio en dólares, igual que en el detalle del producto. */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

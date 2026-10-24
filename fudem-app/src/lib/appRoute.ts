export type AppRoute =
  | { name: 'registro' }
  | { name: 'login' }
  | { name: 'catalogo'; productId: number | null }
  | { name: 'probador'; productId: number | null }
  | { name: 'pago'; productId: number | null }
  | { name: 'documentos' }

export function productIdFromHash(hash: string): number | null {
  const value = hash.replace(/^#/, '')
  if (!value || value === 'catalogo' || value === 'probador' || value === 'pago') {
    return null
  }
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export function readAppRoute(
  pathname = window.location.pathname,
  hash = window.location.hash,
): AppRoute {
  const path = pathname.replace(/\/+$/, '') || '/'
  const hashValue = hash.replace(/^#/, '')

  if (path === '/login' || hashValue === 'login') {
    return { name: 'login' }
  }

  if (path === '/documentos' || hashValue === 'documentos') {
    return { name: 'documentos' }
  }

  if (path === '/probador' || hashValue === 'probador') {
    return { name: 'probador', productId: productIdFromHash(hash) }
  }

  // HU5 / T10: pantalla de pago del producto (/pago#<id>)
  if (path === '/pago' || hashValue === 'pago') {
    return { name: 'pago', productId: productIdFromHash(hash) }
  }

  if (path === '/catalogo' || hashValue === 'catalogo' || productIdFromHash(hash)) {
    return { name: 'catalogo', productId: productIdFromHash(hash) }
  }

  return { name: 'registro' }
}

export function isCatalogRoute(route: AppRoute): boolean {
  return route.name === 'catalogo'
}

export function isProtectedRoute(route: AppRoute): boolean {
  return route.name === 'catalogo' || route.name === 'probador' || route.name === 'documentos' || route.name === 'pago'
}

export function replaceLocation(path: string): void {
  window.history.replaceState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

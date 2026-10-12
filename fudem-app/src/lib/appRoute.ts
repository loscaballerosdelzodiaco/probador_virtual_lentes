export type AppRoute =
  | { name: 'registro' }
  | { name: 'login' }
  | { name: 'catalogo'; productId: number | null }
  | { name: 'probador'; productId: number | null }

export function productIdFromHash(hash: string): number | null {
  const value = hash.replace(/^#/, '')
  if (!value || value === 'catalogo' || value === 'probador') return null
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

  if (path === '/probador' || hashValue === 'probador') {
    return { name: 'probador', productId: productIdFromHash(hash) }
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
  return route.name === 'catalogo' || route.name === 'probador'
}

export function replaceLocation(path: string): void {
  window.history.replaceState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export type CategoryFilter = 'all' | 'hombre' | 'mujer'

export function matchesCategoryFilter(
  category: string | null | undefined,
  filter: CategoryFilter,
): boolean {
  if (filter === 'all') return true

  const normalized = (category ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase()

  if (filter === 'hombre') return normalized.startsWith('hombre')
  if (filter === 'mujer') return normalized.startsWith('mujer')
  return false
}

import { describe, expect, it } from 'vitest'
import { matchesCategoryFilter } from '../lib/categoryFilter'

describe('matchesCategoryFilter con valores reales de Supabase', () => {
  it('acepta Hombres al filtrar por Hombre', () => {
    expect(matchesCategoryFilter('Hombres', 'hombre')).toBe(true)
    expect(matchesCategoryFilter('Hombres', 'mujer')).toBe(false)
    expect(matchesCategoryFilter('Hombres', 'all')).toBe(true)
  })
})

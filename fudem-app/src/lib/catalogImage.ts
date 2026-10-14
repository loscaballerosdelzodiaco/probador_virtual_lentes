export function catalogImageSrc(fileName: string | null): string {
  const name = fileName?.split(/[/\\]/).pop()?.trim()
  return name ? `/catalog/${name}` : '/catalog/aviador.svg'
}

const CATALOG_BRANDS: { prefix: string; marca: string }[] = [
  { prefix: 'EIGHTTOEIGHTY', marca: 'Eight to Eighty' },
  { prefix: 'AFFORDABLEDESIGNS', marca: 'Affordable Designs' },
  { prefix: 'ARMANIEXCHANGE', marca: 'Armani Exchange' },
  { prefix: 'AIRFORCE', marca: 'Air Force' },
  { prefix: 'ARNETTE', marca: 'Arnette' },
  { prefix: 'DEMENEGO', marca: 'Demenego' },
  { prefix: 'CHLO', marca: 'Chloé' },
  { prefix: 'BOSS', marca: 'Boss' },
]

/** Marca a partir del archivo de catálogo (AIRFORCE…, ARNETTE…, BOSS…). */
export function brandFromCatalogFile(fileName: string | null | undefined): string {
  const base = fileName?.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '') ?? ''
  const compact = base.toUpperCase()
  const known = CATALOG_BRANDS.find((brand) => compact.startsWith(brand.prefix))
  if (known) return known.marca

  const letters = base.match(/^[A-Za-z]+/)?.[0]
  if (!letters) return 'FUDEM'
  return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase()
}

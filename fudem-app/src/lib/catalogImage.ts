export function catalogImageFileName(fileName: string | null | undefined): string | null {
  const name = fileName?.split(/[/\\]/).pop()?.trim()
  return name || null
}

export function catalogImageSrc(fileName: string | null): string {
  const name = catalogImageFileName(fileName)
  return name ? `/catalog/${name}` : '/catalog/aviador.svg'
}

/** Overlay frontal del probador (solo aros). Mismo archivo que el catálogo, otra carpeta. */
export function tryOnImageSrc(fileName: string | null | undefined): string | null {
  const name = catalogImageFileName(fileName)
  return name ? `/tryon/${name}` : null
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

export function catalogImageSrc(fileName: string | null): string {
  const name = fileName?.split(/[/\\]/).pop()?.trim()
  return name ? `/catalog/${name}` : '/catalog/aviador.svg'
}

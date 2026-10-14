import { describe, expect, it, vi, afterEach } from 'vitest'
import { MAX_IMAGE_BYTES, validateImageFile } from '../lib/tryOn/imageValidation'

class ImmediateImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  private currentSrc = ''

  set src(value: string) {
    this.currentSrc = value
    queueMicrotask(() => this.onload?.())
  }

  get src() {
    return this.currentSrc
  }
}

function file(name: string, type: string, size = 32): File {
  return new File([new Uint8Array(size)], name, { type })
}

describe('validateImageFile', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('acepta JPG y PNG y los carga en un HTMLImageElement', async () => {
    vi.stubGlobal('Image', ImmediateImage)
    const jpeg = await validateImageFile(file('foto.jpg', 'image/jpeg'))
    const png = await validateImageFile(file('foto.png', 'image/png'))
    const byExtension = await validateImageFile(file('foto.JPEG', ''))

    expect(jpeg.valid).toBe(true)
    expect(png.valid).toBe(true)
    expect(byExtension.valid).toBe(true)
    if (jpeg.valid) expect(jpeg.image).toBeInstanceOf(ImmediateImage)
    if (jpeg.valid) expect(jpeg.image.src.startsWith('blob:')).toBe(true)
  })

  it('rechaza formatos que no son JPG ni PNG', async () => {
    const webp = await validateImageFile(file('foto.webp', 'image/webp'))
    const gif = await validateImageFile(file('foto.gif', 'image/gif'))

    expect(webp).toEqual({ valid: false, error: 'format' })
    expect(gif).toEqual({ valid: false, error: 'format' })
  })

  it('rechaza archivos de más de 5 MB y acepta el límite exacto', async () => {
    vi.stubGlobal('Image', ImmediateImage)
    const tooBig = await validateImageFile(
      file('grande.jpg', 'image/jpeg', MAX_IMAGE_BYTES + 1),
    )
    const exact = await validateImageFile(
      file('limite.png', 'image/png', MAX_IMAGE_BYTES),
    )

    expect(tooBig).toEqual({ valid: false, error: 'size' })
    expect(exact.valid).toBe(true)
  })

  it('prioriza el formato cuando el archivo tampoco cumple el tamaño', async () => {
    const result = await validateImageFile(
      file('grande.webp', 'image/webp', MAX_IMAGE_BYTES + 1),
    )
    expect(result).toEqual({ valid: false, error: 'format' })
  })
})

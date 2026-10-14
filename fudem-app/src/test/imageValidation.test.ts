import { describe, expect, it, vi, afterEach } from 'vitest'
import { detectFace } from '../lib/tryOn/faceDetector'
import {
  MAX_IMAGE_BYTES,
  validateFaceInImage,
  validateImageFile,
} from '../lib/tryOn/imageValidation'

vi.mock('../lib/tryOn/faceDetector', () => ({
  detectFace: vi.fn(),
}))

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

describe('validateFaceInImage', () => {
  const image = { naturalWidth: 100, naturalHeight: 80 } as HTMLImageElement
  const face = {
    leftEye: { x: 30, y: 40 },
    rightEye: { x: 70, y: 40 },
  }

  afterEach(() => {
    vi.mocked(detectFace).mockReset()
  })

  it('acepta una imagen con rostro y entrega el FaceData de T5', async () => {
    vi.mocked(detectFace).mockResolvedValue(face)
    await expect(validateFaceInImage(image)).resolves.toEqual({
      valid: true,
      face,
    })
    expect(detectFace).toHaveBeenCalledOnce()
    expect(detectFace).toHaveBeenCalledWith(image)
  })

  it('rechaza una imagen sin rostro', async () => {
    vi.mocked(detectFace).mockResolvedValue(null)
    await expect(validateFaceInImage(image)).resolves.toEqual({ valid: false })
  })

  it('rechaza la imagen si la detección falla', async () => {
    vi.mocked(detectFace).mockRejectedValue(new Error('modelo'))
    await expect(validateFaceInImage(image)).resolves.toEqual({ valid: false })
  })
})

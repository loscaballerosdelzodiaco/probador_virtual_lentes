import { describe, expect, it, vi, afterEach } from 'vitest'
import { detectFace } from '../lib/tryOn/faceDetector'
import {
  MAX_IMAGE_BYTES,
  validateFaceInImage,
  validateImageFile,
} from '../lib/tryOn/imageValidation'
import { TRYON_MESSAGES } from '../lib/tryOn/messages'

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
  const created = new File([new Uint8Array(Math.min(size, 32))], name, { type })
  Object.defineProperty(created, 'size', { value: size })
  return created
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

  it('acepta un JPG de 0 bytes: no hay chequeo de archivo vacío en la implementación', async () => {
    vi.stubGlobal('Image', ImmediateImage)
    const empty = await validateImageFile(file('vacio.jpg', 'image/jpeg', 0))
    expect(empty.valid).toBe(true)
  })

  it('el error de formato corresponde a E3 (unsupportedFormat)', () => {
    expect(TRYON_MESSAGES.unsupportedFormat).toBe(
      'Formato no compatible, sube una imagen JPG o PNG',
    )
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

  it('no reutiliza FaceData previo: la firma solo recibe la imagen y siempre llama a detectFace', async () => {
    vi.mocked(detectFace).mockResolvedValue(face)
    await validateFaceInImage(image)
    await validateFaceInImage(image)
    expect(detectFace).toHaveBeenCalledTimes(2)
    expect(validateFaceInImage).toHaveLength(1)
  })

  it('sin rostro o con fallo de detector el llamador debe usar E1 (invalidImage)', () => {
    expect(TRYON_MESSAGES.invalidImage).toBe(
      'La imagen no es válida, sube una fotografía donde se vea tu rostro',
    )
  })
})

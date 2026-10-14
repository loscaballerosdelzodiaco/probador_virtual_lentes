/** Límite de la foto del probador. El archivo no sale del navegador. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const JPEG_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/pjpeg'])
const PNG_TYPES = new Set(['image/png', 'image/x-png'])

export type ImageFileError = 'format' | 'size'

export type ImageValidationResult =
  | { valid: true; image: HTMLImageElement }
  | { valid: false; error: ImageFileError }

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : ''
}

function isJpgOrPng(file: File): boolean {
  const type = file.type.toLowerCase()
  if (JPEG_TYPES.has(type) || PNG_TYPES.has(type)) return true
  if (type && type !== 'application/octet-stream') return false
  const extension = extensionOf(file.name)
  return extension === 'jpg' || extension === 'jpeg' || extension === 'png'
}

function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    image.src = url
  })
}

/**
 * Acepta solo JPG o PNG de hasta 5 MB y, si pasa, la deja lista en un HTMLImageElement.
 */
export async function validateImageFile(file: File): Promise<ImageValidationResult> {
  if (!isJpgOrPng(file)) return { valid: false, error: 'format' }
  if (file.size > MAX_IMAGE_BYTES) return { valid: false, error: 'size' }
  const image = await loadImage(file)
  return { valid: true, image }
}

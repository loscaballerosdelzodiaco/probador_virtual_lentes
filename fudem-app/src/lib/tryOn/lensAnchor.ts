import type { LensAnchor } from './types'

const EMPTY_ANCHOR: LensAnchor = { x: 0, y: 0, width: 0, height: 0 }
const ALPHA_VISIBLE = 16

const cache = new Map<string, LensAnchor>()

export function clearLensAnchorCache(): void {
  cache.clear()
}

export function boundingBoxFromAlpha(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): LensAnchor {
  if (width <= 0 || height <= 0 || pixels.length < width * height * 4) {
    return { ...EMPTY_ANCHOR }
  }

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y += 1) {
    const row = y * width
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(row + x) * 4 + 3]
      if (alpha > ALPHA_VISIBLE) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { ...EMPTY_ANCHOR }
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

function cacheKey(image: HTMLImageElement): string {
  return image.currentSrc || image.src
}

function imageSize(image: HTMLImageElement): { width: number; height: number } {
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  }
}

function readPixels(
  image: HTMLImageElement,
  width: number,
  height: number,
): Uint8ClampedArray {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('No se pudo leer el canvas del lente')
  }
  context.clearRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  return context.getImageData(0, 0, width, height).data
}

/**
 * Recuadro mínimo de píxeles visibles (alpha > 0) en la imagen del lente.
 * Las coordenadas usan el tamaño real de `img` (300×300 o 1500×1500).
 */
export function getLensAnchor(image: HTMLImageElement): LensAnchor {
  const key = cacheKey(image)
  if (key) {
    const cached = cache.get(key)
    if (cached) return { ...cached }
  }

  const { width, height } = imageSize(image)
  if (!image.complete || width <= 0 || height <= 0) {
    return { ...EMPTY_ANCHOR }
  }

  try {
    const anchor = boundingBoxFromAlpha(readPixels(image, width, height), width, height)
    if (key) cache.set(key, { ...anchor })
    return { ...anchor }
  } catch {
    return { ...EMPTY_ANCHOR }
  }
}

import {
  computeLensTransform,
  drawLens,
  type LensManualAdjust,
} from './lensTransform'
import type { FaceData, LensAnchor } from './types'

export const CAPTURE_FAILED_MESSAGE =
  'No se pudo capturar el resultado. Inténtalo de nuevo.'

export type CaptureLensLayer = {
  image: CanvasImageSource
  anchor: LensAnchor
  face: FaceData
  adjust?: Partial<LensManualAdjust>
}

function sourceSize(source: CanvasImageSource): { width: number; height: number } | null {
  if (source instanceof HTMLVideoElement) {
    return source.videoWidth > 0 && source.videoHeight > 0
      ? { width: source.videoWidth, height: source.videoHeight }
      : null
  }
  if (source instanceof HTMLImageElement) {
    const width = source.naturalWidth || source.width
    const height = source.naturalHeight || source.height
    return width > 0 && height > 0 ? { width, height } : null
  }
  if (source instanceof HTMLCanvasElement) {
    return source.width > 0 && source.height > 0
      ? { width: source.width, height: source.height }
      : null
  }
  return null
}

function assertCanvas(canvas: HTMLCanvasElement | null | undefined): HTMLCanvasElement {
  if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
    throw new Error(CAPTURE_FAILED_MESSAGE)
  }
  if (!canvas.getContext('2d')) {
    throw new Error(CAPTURE_FAILED_MESSAGE)
  }
  return canvas
}

/**
 * Compone fondo (video o foto) + lente en `canvas`.
 * No descarga nada.
 */
export function drawCaptureFrame(
  canvas: HTMLCanvasElement,
  background: CanvasImageSource,
  lens?: CaptureLensLayer | null,
): void {
  const ctx = canvas.getContext('2d')
  const size = sourceSize(background)
  if (!ctx || !size) {
    throw new Error(CAPTURE_FAILED_MESSAGE)
  }

  canvas.width = size.width
  canvas.height = size.height
  ctx.clearRect(0, 0, size.width, size.height)
  ctx.drawImage(background, 0, 0, size.width, size.height)

  if (lens) {
    drawLens(
      ctx,
      lens.image,
      lens.anchor,
      computeLensTransform(lens.face, lens.anchor, lens.adjust),
    )
  }
}

/**
 * Convierte el canvas final a PNG. Si ya incluye fondo y lente, no redibuja.
 * No inicia la descarga.
 */
export function captureResult(canvas: HTMLCanvasElement | null | undefined): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const ready = assertCanvas(canvas)
      ready.toBlob((blob) => {
        if (!blob || blob.size === 0) {
          reject(new Error(CAPTURE_FAILED_MESSAGE))
          return
        }
        resolve(blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' }))
      }, 'image/png')
    } catch {
      reject(new Error(CAPTURE_FAILED_MESSAGE))
    }
  })
}

/** Nombre `probador-<modelo>.png` sin caracteres inválidos. */
export function captureFilename(modelName: string): string {
  const slug = modelName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `probador-${slug || 'lentes'}.png`
}

/** Descarga el PNG con el nombre indicado y libera el object URL. */
export function downloadCapture(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

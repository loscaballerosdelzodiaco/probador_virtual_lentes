import type { FaceData, LensAnchor, LensTransform } from './types'

/** Ajuste manual opcional (T9). La rotación va en grados, como el control de la T7. */
export type LensManualAdjust = {
  dx: number
  dy: number
  scale: number
  rotation: number
}

const DEFAULT_ADJUST: LensManualAdjust = {
  dx: 0,
  dy: 0,
  scale: 1,
  rotation: 0,
}

/** El aro cubre más que la distancia entre pupilas (aro + aros). */
export const LENS_WIDTH_OVER_IPD = 2.15

function imageSize(image: CanvasImageSource): { width: number; height: number } | null {
  if (image instanceof HTMLImageElement) {
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    return width > 0 && height > 0 ? { width, height } : null
  }
  if (image instanceof HTMLVideoElement) {
    return image.videoWidth > 0 && image.videoHeight > 0
      ? { width: image.videoWidth, height: image.videoHeight }
      : null
  }
  if (image instanceof HTMLCanvasElement) {
    return image.width > 0 && image.height > 0
      ? { width: image.width, height: image.height }
      : null
  }
  if (typeof OffscreenCanvas !== 'undefined' && image instanceof OffscreenCanvas) {
    return image.width > 0 && image.height > 0
      ? { width: image.width, height: image.height }
      : null
  }
  return null
}

/**
 * Posición, ancho y rotación del lente sobre el rostro.
 * El ancho es la distancia entre ojos × LENS_WIDTH_OVER_IPD × escala manual.
 * La rotación es el ángulo entre ambos ojos, en radianes.
 * `anchor` delimita el lente dentro de la imagen; si no es válido, el ancho queda en 0.
 */
export function computeLensTransform(
  face: FaceData,
  anchor: LensAnchor,
  adjust?: Partial<LensManualAdjust>,
): LensTransform {
  const dx = adjust?.dx ?? DEFAULT_ADJUST.dx
  const dy = adjust?.dy ?? DEFAULT_ADJUST.dy
  const scale = adjust?.scale ?? DEFAULT_ADJUST.scale
  const manualRotation = ((adjust?.rotation ?? DEFAULT_ADJUST.rotation) * Math.PI) / 180

  const eyeDx = face.rightEye.x - face.leftEye.x
  const eyeDy = face.rightEye.y - face.leftEye.y
  const eyeDistance = Math.hypot(eyeDx, eyeDy)
  const eyeAngle = Math.atan2(eyeDy, eyeDx)

  const anchorIsValid = anchor.width > 0 && anchor.height > 0

  return {
    x: (face.leftEye.x + face.rightEye.x) / 2 + dx,
    y: (face.leftEye.y + face.rightEye.y) / 2 + dy,
    width: anchorIsValid ? eyeDistance * LENS_WIDTH_OVER_IPD * scale : 0,
    rotation: eyeAngle + manualRotation,
  }
}

/**
 * Dibuja la imagen completa del modelo.
 * El punto que se alinea con los ojos es el centro de `LensAnchor`, no el centro de la imagen.
 */
export function drawLens(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  anchor: LensAnchor,
  transform: LensTransform,
): void {
  const size = imageSize(image)
  if (!size || !(anchor.width > 0) || !(transform.width > 0)) return

  const scale = transform.width / anchor.width
  const anchorCenterX = anchor.x + anchor.width / 2
  const anchorCenterY = anchor.y + anchor.height / 2

  ctx.save()
  ctx.translate(transform.x, transform.y)
  ctx.rotate(transform.rotation)
  ctx.drawImage(
    image,
    -anchorCenterX * scale,
    -anchorCenterY * scale,
    size.width * scale,
    size.height * scale,
  )
  ctx.restore()
}

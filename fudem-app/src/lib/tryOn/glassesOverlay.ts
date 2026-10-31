import { PHOTO_POSITION_UNIT } from './adjust'
import { isFaceFrontal } from './facePose'
import { getLensAnchor } from './lensAnchor'
import {
  computeLensTransform,
  drawLens,
  type LensManualAdjust,
} from './lensTransform'
import type { FaceData, LensAnchor } from './types'

export function anchorFromImage(image: HTMLImageElement): LensAnchor | null {
  const anchor = getLensAnchor(image)
  if (!(anchor.width > 0 && anchor.height > 0)) return null
  return anchor
}

export function drawPhotoLensOnCanvas(
  canvas: HTMLCanvasElement,
  photo: HTMLImageElement,
  face: FaceData,
  lensImage: HTMLImageElement,
  lensAnchor: LensAnchor,
  adjust: LensManualAdjust,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const width = photo.naturalWidth || photo.width
  const height = photo.naturalHeight || photo.height
  if (width <= 0 || height <= 0) return
  canvas.width = width
  canvas.height = height
  const nudge = Math.max(width, height) * PHOTO_POSITION_UNIT
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(photo, 0, 0, width, height)
  drawLens(
    ctx,
    lensImage,
    lensAnchor,
    computeLensTransform(face, lensAnchor, {
      ...adjust,
      dx: adjust.dx * nudge,
      dy: adjust.dy * nudge,
    }),
  )
}

export function drawCameraLensOnCanvas(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  face: FaceData,
  lensImage: HTMLImageElement,
  lensAnchor: LensAnchor,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const width = video.videoWidth
  const height = video.videoHeight
  if (width <= 0 || height <= 0) return
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  ctx.clearRect(0, 0, width, height)
  if (!isFaceFrontal(face)) return
  drawLens(ctx, lensImage, lensAnchor, computeLensTransform(face, lensAnchor))
}

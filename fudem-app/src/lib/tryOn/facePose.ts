import type { FaceData } from './types'

/** Umbral de yaw (desplazamiento de nariz / IPD). Por encima, el frente 2D ya no encaja. */
export const MAX_FACE_YAW = 0.32

export function isFaceFrontal(face: FaceData, maxYaw = MAX_FACE_YAW): boolean {
  return Math.abs(face.yaw ?? 0) <= maxYaw
}

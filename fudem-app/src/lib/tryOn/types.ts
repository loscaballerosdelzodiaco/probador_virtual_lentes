export type Point = {
  x: number
  y: number
}

export type FaceData = {
  leftEye: Point
  rightEye: Point
  /** Desplazamiento horizontal de la nariz respecto al centro de los ojos, en unidades de IPD. 0 = de frente. */
  yaw?: number
}

export type LensAnchor = {
  x: number
  y: number
  width: number
  height: number
}

export type LensTransform = {
  x: number
  y: number
  width: number
  rotation: number
}

export type TryOnModel = {
  id: number
  nombre: string
  marca: string
  /** Miniatura de catálogo (puede incluir patas). */
  imageUrl: string
  /** WebP frontal de solo aros en /tryon. */
  overlayUrl: string
}

export type Point = {
  x: number
  y: number
}

export type FaceData = {
  leftEye: Point
  rightEye: Point
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
  imageUrl: string
}

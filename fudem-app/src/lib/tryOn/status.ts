import type { TRYON_MESSAGES } from './messages'
import type { FaceData } from './types'

/** Estados de la pantalla del probador (HU3 / T13). TryOnPage solo lee esto para decidir qué mostrar. */
export type TryOnStatus =
  | 'loading' // iniciando la cámara o procesando una foto
  | 'camera' // cámara activa
  | 'photo' // foto cargada
  | 'faceNotDetected' // cámara activa sin rostro a la vista
  | 'error' // hay un mensaje de error de TRYON_MESSAGES
  | 'idle' // modo foto sin foto todavía

export type TryOnErrorKey = keyof typeof TRYON_MESSAGES

export type TryOnStatusInput = {
  mode: 'camera' | 'photo'
  cameraReady: boolean
  photoLoading: boolean
  hasPhoto: boolean
  /** undefined: aún sin detección; null: sin rostro; FaceData: rostro encontrado */
  cameraFace: FaceData | null | undefined
  errorKey: TryOnErrorKey | null
}

export function getTryOnStatus(input: TryOnStatusInput): TryOnStatus {
  if (input.errorKey) return 'error'
  if (input.photoLoading) return 'loading'
  if (input.mode === 'camera') {
    if (!input.cameraReady) return 'loading'
    return input.cameraFace === null ? 'faceNotDetected' : 'camera'
  }
  return input.hasPhoto ? 'photo' : 'idle'
}

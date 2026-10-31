import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import type { FaceData, Point } from './types'

// Detección facial con MediaPipe (HU3 / T5)

const WASM_URL: string =
  import.meta.env.VITE_FACE_WASM_URL ??
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm'

const MODEL_URL: string =
  import.meta.env.VITE_FACE_MODEL_URL ??
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

// Índices de la malla de MediaPipe (lados anatómicos del sujeto)
const NOSE_TIP = 1
const IRIS_CENTER_A = 468
const IRIS_CENTER_B = 473
const CORNERS_A: [number, number] = [33, 133]
const CORNERS_B: [number, number] = [362, 263]
const MESH_POINTS = 468
const MESH_POINTS_WITH_IRIS = 478

type RunningMode = 'IMAGE' | 'VIDEO'
type LandmarkXY = Pick<NormalizedLandmark, 'x' | 'y'>

let landmarkerPromise: Promise<FaceLandmarker> | null = null
let currentMode: RunningMode = 'IMAGE'
let lastVideoTimestamp = -1
// Cola para que dos llamadas no cambien el modo a la vez
let queue: Promise<unknown> = Promise.resolve()

async function createLandmarker(): Promise<FaceLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
  const build = (delegate: 'GPU' | 'CPU') =>
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'IMAGE',
      numFaces: 1,
    })

  let landmarker: FaceLandmarker
  try {
    landmarker = await build('GPU')
  } catch {
    landmarker = await build('CPU')
  }
  currentMode = 'IMAGE'
  lastVideoTimestamp = -1
  return landmarker
}

function getLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = createLandmarker().catch((error: unknown) => {
      landmarkerPromise = null // permite reintentar
      throw error
    })
  }
  return landmarkerPromise
}

function isFinitePoint(point: LandmarkXY | undefined): point is LandmarkXY {
  return Boolean(point) && Number.isFinite(point!.x) && Number.isFinite(point!.y)
}

function middle(a: LandmarkXY | undefined, b: LandmarkXY | undefined): LandmarkXY | null {
  if (!isFinitePoint(a) || !isFinitePoint(b)) return null
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** Puntos normalizados (0..1) de MediaPipe a FaceData en píxeles. */
export function landmarksToFaceData(
  landmarks: ReadonlyArray<LandmarkXY>,
  width: number,
  height: number,
): FaceData | null {
  if (landmarks.length < MESH_POINTS || width <= 0 || height <= 0) return null

  const hasIris = landmarks.length >= MESH_POINTS_WITH_IRIS
  const a = hasIris
    ? landmarks[IRIS_CENTER_A]
    : middle(landmarks[CORNERS_A[0]], landmarks[CORNERS_A[1]])
  const b = hasIris
    ? landmarks[IRIS_CENTER_B]
    : middle(landmarks[CORNERS_B[0]], landmarks[CORNERS_B[1]])
  if (!isFinitePoint(a ?? undefined) || !isFinitePoint(b ?? undefined)) return null

  const toPixels = (p: LandmarkXY): Point => ({ x: p.x * width, y: p.y * height })
  const pa = toPixels(a as LandmarkXY)
  const pb = toPixels(b as LandmarkXY)
  const leftEye = pa.x <= pb.x ? pa : pb
  const rightEye = pa.x <= pb.x ? pb : pa
  const eyeDistance = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y)

  let yaw = 0
  if (isFinitePoint(landmarks[NOSE_TIP]) && eyeDistance > 0) {
    const nose = toPixels(landmarks[NOSE_TIP])
    yaw = (nose.x - (leftEye.x + rightEye.x) / 2) / eyeDistance
  }

  return { leftEye, rightEye, yaw }
}

async function setMode(landmarker: FaceLandmarker, mode: RunningMode) {
  if (currentMode === mode) return
  await landmarker.setOptions({ runningMode: mode })
  currentMode = mode
}

async function runDetection(
  source: HTMLVideoElement | HTMLImageElement,
): Promise<FaceData | null> {
  if (source instanceof HTMLVideoElement) {
    if (source.readyState < 2 || source.videoWidth === 0) return null
    const landmarker = await getLandmarker()
    await setMode(landmarker, 'VIDEO')
    // MediaPipe exige marcas de tiempo crecientes
    const timestamp = Math.max(performance.now(), lastVideoTimestamp + 1)
    lastVideoTimestamp = timestamp
    const result = landmarker.detectForVideo(source, timestamp)
    const face = result.faceLandmarks[0]
    return face
      ? landmarksToFaceData(face, source.videoWidth, source.videoHeight)
      : null
  }

  if (!source.complete || source.naturalWidth === 0) {
    try {
      await source.decode()
    } catch {
      return null
    }
    if (source.naturalWidth === 0) return null
  }
  const landmarker = await getLandmarker()
  await setMode(landmarker, 'IMAGE')
  const result = landmarker.detect(source)
  const face = result.faceLandmarks[0]
  return face
    ? landmarksToFaceData(face, source.naturalWidth, source.naturalHeight)
    : null
}

/**
 * Ojos en píxeles de la fuente (sin espejar), o `null` si no hay rostro.
 * Rechaza solo si el modelo no carga: capturar el error al llamar.
 */
export function detectFace(
  source: HTMLVideoElement | HTMLImageElement,
): Promise<FaceData | null> {
  const run = queue.then(() => runDetection(source))
  queue = run.catch(() => undefined)
  return run
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const detect = vi.fn()
const detectForVideo = vi.fn()
const setOptions = vi.fn().mockResolvedValue(undefined)
const close = vi.fn()
const createFromOptions = vi.fn()
const forVisionTasks = vi.fn().mockResolvedValue({})

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks },
  FaceLandmarker: { createFromOptions },
}))

type Pt = { x: number; y: number }

/** Malla de 478 puntos; solo los índices de iris importan en estas pruebas. */
function mesh(rightIris: Pt, leftIris: Pt, withIris = true): Pt[] {
  const points = Array.from({ length: withIris ? 478 : 468 }, () => ({ x: 0.5, y: 0.5 }))
  if (withIris) {
    points[468] = rightIris
    points[473] = leftIris
  } else {
    points[33] = { x: rightIris.x - 0.02, y: rightIris.y }
    points[133] = { x: rightIris.x + 0.02, y: rightIris.y }
    points[362] = { x: leftIris.x - 0.02, y: leftIris.y }
    points[263] = { x: leftIris.x + 0.02, y: leftIris.y }
  }
  return points
}

function fakeVideo(width = 640, height = 480, readyState = 4): HTMLVideoElement {
  const video = document.createElement('video')
  Object.defineProperty(video, 'videoWidth', { value: width })
  Object.defineProperty(video, 'videoHeight', { value: height })
  Object.defineProperty(video, 'readyState', { value: readyState })
  return video
}

function fakeImage(width = 400, height = 200): HTMLImageElement {
  const img = document.createElement('img')
  Object.defineProperty(img, 'complete', { value: true })
  Object.defineProperty(img, 'naturalWidth', { value: width })
  Object.defineProperty(img, 'naturalHeight', { value: height })
  return img
}

describe('faceDetector', () => {
  beforeEach(async () => {
    vi.resetModules()
    detect.mockReset()
    detectForVideo.mockReset()
    setOptions.mockClear()
    createFromOptions.mockReset()
    createFromOptions.mockResolvedValue({ detect, detectForVideo, setOptions, close })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('landmarksToFaceData convierte a píxeles y ordena izquierda/derecha por x', async () => {
    const { landmarksToFaceData } = await import('../lib/tryOn/faceDetector')
    // El iris "A" (ojo derecho del sujeto) cae a la izquierda de la imagen.
    const face = landmarksToFaceData(mesh({ x: 0.4, y: 0.5 }, { x: 0.6, y: 0.5 }), 1000, 500)
    expect(face).toEqual({
      leftEye: { x: 400, y: 250 },
      rightEye: { x: 600, y: 250 },
      yaw: 0,
    })
    const swapped = landmarksToFaceData(mesh({ x: 0.7, y: 0.4 }, { x: 0.3, y: 0.4 }), 100, 100)
    expect(swapped?.leftEye.x).toBeCloseTo(30)
    expect(swapped?.rightEye.x).toBeCloseTo(70)
  })

  it('calcula el yaw con el desplazamiento de la nariz respecto a los ojos', async () => {
    const { landmarksToFaceData } = await import('../lib/tryOn/faceDetector')
    const points = mesh({ x: 0.4, y: 0.5 }, { x: 0.6, y: 0.5 })
    points[1] = { x: 0.56, y: 0.55 }
    const face = landmarksToFaceData(points, 1000, 500)
    expect(face?.yaw).toBeCloseTo(0.3)
  })

  it('usa las esquinas del ojo si el modelo no trae iris', async () => {
    const { landmarksToFaceData } = await import('../lib/tryOn/faceDetector')
    const face = landmarksToFaceData(mesh({ x: 0.4, y: 0.5 }, { x: 0.6, y: 0.5 }, false), 100, 100)
    expect(face?.leftEye.x).toBeCloseTo(40)
    expect(face?.rightEye.x).toBeCloseTo(60)
  })

  it('landmarksToFaceData devuelve null con datos inválidos', async () => {
    const { landmarksToFaceData } = await import('../lib/tryOn/faceDetector')
    expect(landmarksToFaceData([], 100, 100)).toBeNull()
    expect(landmarksToFaceData(mesh({ x: 0.4, y: 0.5 }, { x: 0.6, y: 0.5 }), 0, 100)).toBeNull()
    expect(
      landmarksToFaceData(mesh({ x: NaN, y: 0.5 }, { x: 0.6, y: 0.5 }), 100, 100),
    ).toBeNull()
  })

  it('detecta en una imagen y devuelve ojos en píxeles naturales', async () => {
    detect.mockReturnValue({ faceLandmarks: [mesh({ x: 0.25, y: 0.5 }, { x: 0.75, y: 0.5 })] })
    const { detectFace } = await import('../lib/tryOn/faceDetector')
    const face = await detectFace(fakeImage(400, 200))
    expect(face).toEqual({ leftEye: { x: 100, y: 100 }, rightEye: { x: 300, y: 100 }, yaw: 0 })
  })

  it('devuelve null si no hay rostro', async () => {
    detect.mockReturnValue({ faceLandmarks: [] })
    const { detectFace } = await import('../lib/tryOn/faceDetector')
    expect(await detectFace(fakeImage())).toBeNull()
  })

  it('detecta en video con marcas de tiempo crecientes y cambia a modo VIDEO', async () => {
    detectForVideo.mockReturnValue({ faceLandmarks: [mesh({ x: 0.4, y: 0.5 }, { x: 0.6, y: 0.5 })] })
    const { detectFace } = await import('../lib/tryOn/faceDetector')
    const video = fakeVideo(640, 480)
    const face = await detectFace(video)
    await detectFace(video)
    expect(face).toEqual({ leftEye: { x: 256, y: 240 }, rightEye: { x: 384, y: 240 }, yaw: 0 })
    expect(setOptions).toHaveBeenCalledWith({ runningMode: 'VIDEO' })
    const [t1, t2] = detectForVideo.mock.calls.map((call) => call[1] as number)
    expect(t2).toBeGreaterThan(t1)
  })

  it('devuelve null si el video aún no tiene frames', async () => {
    const { detectFace } = await import('../lib/tryOn/faceDetector')
    expect(await detectFace(fakeVideo(0, 0, 0))).toBeNull()
    expect(createFromOptions).not.toHaveBeenCalled()
  })

  it('carga el modelo una sola vez aunque haya varias detecciones', async () => {
    detect.mockReturnValue({ faceLandmarks: [] })
    const { detectFace } = await import('../lib/tryOn/faceDetector')
    await Promise.all([detectFace(fakeImage()), detectFace(fakeImage()), detectFace(fakeImage())])
    await detectFace(fakeImage())
    expect(createFromOptions).toHaveBeenCalledTimes(1)
    expect(forVisionTasks).toHaveBeenCalledTimes(1)
  })

  it('cae a CPU si el delegado GPU falla', async () => {
    createFromOptions
      .mockReset()
      .mockRejectedValueOnce(new Error('gpu'))
      .mockResolvedValueOnce({ detect, detectForVideo, setOptions, close })
    detect.mockReturnValue({ faceLandmarks: [] })
    const { detectFace } = await import('../lib/tryOn/faceDetector')
    await detectFace(fakeImage())
    expect(createFromOptions.mock.calls[0][1].baseOptions.delegate).toBe('GPU')
    expect(createFromOptions.mock.calls[1][1].baseOptions.delegate).toBe('CPU')
  })

  it('rechaza si el modelo no carga y permite reintentar', async () => {
    createFromOptions.mockReset().mockRejectedValue(new Error('sin red'))
    const { detectFace } = await import('../lib/tryOn/faceDetector')
    await expect(detectFace(fakeImage())).rejects.toThrow()

    createFromOptions.mockReset().mockResolvedValue({ detect, detectForVideo, setOptions, close })
    detect.mockReturnValue({ faceLandmarks: [] })
    expect(await detectFace(fakeImage())).toBeNull()
  })
})

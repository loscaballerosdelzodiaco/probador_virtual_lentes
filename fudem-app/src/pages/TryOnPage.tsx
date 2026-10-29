import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import {
  ManualAdjustControls,
  type ManualAdjustValues,
} from '../components/ManualAdjustControls'
import {
  ModelSelector,
  type ModelSelectorProps,
} from '../components/ModelSelector'
import {
  captureFilename,
  captureResult,
  downloadCapture,
  drawCaptureFrame,
} from '../lib/tryOn/captureService'
import { requestCameraAccess, stopCamera } from '../lib/tryOn/cameraService'
import { detectFace } from '../lib/tryOn/faceDetector'
import { PHOTO_POSITION_UNIT } from '../lib/tryOn/adjust'
import { isFaceFrontal } from '../lib/tryOn/facePose'
import {
  validateFaceInImage,
  validateImageFile,
} from '../lib/tryOn/imageValidation'
import { getLensAnchor } from '../lib/tryOn/lensAnchor'
import { computeLensTransform, drawLens } from '../lib/tryOn/lensTransform'
import { TRYON_MESSAGES, TRYON_STATUS_TEXT } from '../lib/tryOn/messages'
import { getTryOnStatus, type TryOnErrorKey } from '../lib/tryOn/status'
import type { FaceData, LensAnchor, TryOnModel } from '../lib/tryOn/types'
import './TryOnPage.css'

export type TryOnMode = 'camera' | 'photo'
export type { TryOnErrorKey }

export type TryOnPageProps = {
  /** Lo calcula appRoute (readAppRoute) desde /probador#<idProducto> y lo pasa App */
  productId?: number | null
  /** T6: modelos y selección */
  models?: TryOnModel[]
  selectedModelId?: number | null
  onSelectModel?: ModelSelectorProps['onSelect']
  /** T7: ajuste manual (modo foto) */
  adjust?: ManualAdjustValues
  onAdjustChange?: (next: ManualAdjustValues) => void
  /** T4: cada frame listo de la cámara (T5/T6 enganchan detección y dibujo aquí) */
  onFrame?: (video: HTMLVideoElement) => void
  /** T4: recibe el archivo elegido en "Subir fotografía" */
  onUploadPhoto?: (file: File) => void
  /** T8: FaceData de la foto (una sola detección) para T6 */
  onPhotoFace?: (face: FaceData, image: HTMLImageElement) => void
  lensImage?: HTMLImageElement | null
  lensAnchor?: LensAnchor | null
  /** T14: se llama tras una captura descargada por el usuario */
  onCapture?: () => void
  canCapture?: boolean
  /** Error controlado desde fuera (A2, E1, E3) */
  errorKey?: TryOnErrorKey | null
  onDismissError?: () => void
}

const DEFAULT_ADJUST: ManualAdjustValues = { dx: 0, dy: 0, scale: 1, rotation: 0 }
const noop = () => {}

function anchorFromImage(image: HTMLImageElement): LensAnchor | null {
  const anchor = getLensAnchor(image)
  if (!(anchor.width > 0 && anchor.height > 0)) return null
  return anchor
}

function resolveSelectedId(
  selectedModelId: number | null | undefined,
  internalSelectedId: number | null,
  currentProductId: number | null,
  models: TryOnModel[],
): number | null {
  const preferred = selectedModelId ?? internalSelectedId ?? currentProductId
  if (
    preferred != null &&
    (models.length === 0 || models.some((model) => model.id === preferred))
  ) {
    return preferred
  }
  return models[0]?.id ?? null
}

function drawPhotoLensOnCanvas(
  canvas: HTMLCanvasElement,
  photo: HTMLImageElement,
  face: FaceData,
  lensImage: HTMLImageElement,
  lensAnchor: LensAnchor,
  adjust: ManualAdjustValues,
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

function drawCameraLensOnCanvas(
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

export function TryOnPage({
  productId = null,
  models = [],
  selectedModelId,
  onSelectModel = noop,
  adjust = DEFAULT_ADJUST,
  onAdjustChange = noop,
  onFrame = noop,
  onUploadPhoto = noop,
  onPhotoFace = noop,
  lensImage = null,
  lensAnchor = null,
  onCapture = noop,
  canCapture,
  errorKey = null,
  onDismissError = noop,
}: TryOnPageProps) {
  const [mode, setMode] = useState<TryOnMode>('camera')
  const [cameraError, setCameraError] = useState<TryOnErrorKey | null>(null)
  const [cameraAttempt, setCameraAttempt] = useState(0)
  const [cameraReady, setCameraReady] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [userPhoto, setUserPhoto] = useState<HTMLImageElement | null>(null)
  const [photoFace, setPhotoFace] = useState<FaceData | null>(null)
  const [internalSelectedId, setInternalSelectedId] = useState<number | null>(null)
  const [modelLensImage, setModelLensImage] = useState<HTMLImageElement | null>(null)
  const [internalAdjust, setInternalAdjust] = useState<ManualAdjustValues>(adjust)
  const [cameraFace, setCameraFace] = useState<FaceData | null | undefined>(undefined)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const onFrameRef = useRef(onFrame)
  const frameIdRef = useRef(0)
  const uploadSeqRef = useRef(0)
  const photoUrlRef = useRef<string | null>(null)
  const detectingRef = useRef(false)
  const cameraDrawRef = useRef<{
    face: FaceData | null | undefined
    lensImage: HTMLImageElement | null
    lensAnchor: LensAnchor | null
  }>({ face: undefined, lensImage: null, lensAnchor: null })

  const adjustValues = internalAdjust
  const canAdjustLens = Boolean(userPhoto && photoFace)
  const selectedId = resolveSelectedId(
    selectedModelId,
    internalSelectedId,
    productId,
    models,
  )
  const selectedModel = models.find((model) => model.id === selectedId) ?? null

  if (mode !== 'camera') {
    if (cameraReady) setCameraReady(false)
    if (cameraFace !== undefined) setCameraFace(undefined)
  }

  if (!selectedModel?.overlayUrl && modelLensImage) {
    setModelLensImage(null)
  }

  function handleAdjustChange(next: ManualAdjustValues) {
    setInternalAdjust(next)
    onAdjustChange(next)
  }

  useEffect(() => {
    return () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    }
  }, [])

  // T3/T4: pedir la cámara cuando el modo es "camera"
  useEffect(() => {
    if (mode !== 'camera') {
      return
    }

    const video = videoRef.current
    let cancelled = false
    let activeStream: MediaStream | null = null

    void (async () => {
      const result = await requestCameraAccess()

      if (cancelled) {
        if (result.ok) stopCamera(result.stream)
        return
      }

      if (!result.ok) {
        setCameraReady(false)
        setCameraError('cameraUnavailable')
        return
      }

      activeStream = result.stream
      if (video) {
        video.srcObject = result.stream
        video.muted = true
        video.playsInline = true
        video.autoplay = true
        try {
          await video.play()
        } catch {
          /* autoplay o jsdom: el atributo autoPlay sigue mostrando el stream */
        }
      }
      setCameraReady(true)
    })()

    return () => {
      cancelled = true
      setCameraReady(false)
      stopCamera(activeStream)
      if (video) video.srcObject = null
    }
  }, [mode, cameraAttempt])

  // T4: exponer frames listos; T5/T6 pueden usar onFrame sin tocar este bucle
  useEffect(() => {
    if (mode !== 'camera' || !cameraReady) {
      return
    }

    let running = true

    const tick = () => {
      if (!running) return
      const video = videoRef.current
      const hasFrame =
        video !== null &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0

      if (hasFrame) {
        onFrameRef.current(video)
        const canvas = canvasRef.current
        const overlay = cameraDrawRef.current
        if (canvas) {
          if (
            overlay.face &&
            overlay.lensImage &&
            overlay.lensAnchor &&
            isFaceFrontal(overlay.face)
          ) {
            drawCameraLensOnCanvas(
              canvas,
              video,
              overlay.face,
              overlay.lensImage,
              overlay.lensAnchor,
            )
          } else {
            const ctx = canvas.getContext('2d')
            ctx?.clearRect(0, 0, canvas.width, canvas.height)
          }
        }
        if (!detectingRef.current) {
          detectingRef.current = true
          void detectFace(video)
            .then((face) => {
              if (!running) return
              cameraDrawRef.current = { ...cameraDrawRef.current, face }
              setCameraFace(face)
            })
            .catch(() => {
              if (!running) return
              cameraDrawRef.current = { ...cameraDrawRef.current, face: null }
              setCameraFace(null)
            })
            .finally(() => {
              detectingRef.current = false
            })
        }
      }

      frameIdRef.current = window.requestAnimationFrame(tick)
    }

    frameIdRef.current = window.requestAnimationFrame(tick)

    return () => {
      running = false
      window.cancelAnimationFrame(frameIdRef.current)
      frameIdRef.current = 0
    }
  }, [mode, cameraReady])

  const activeLensImage = selectedModel ? modelLensImage : lensImage
  const activeLensAnchor = useMemo(() => {
    if (!selectedModel) return lensAnchor
    return modelLensImage ? anchorFromImage(modelLensImage) : null
  }, [selectedModel, modelLensImage, lensAnchor])

  useLayoutEffect(() => {
    onFrameRef.current = onFrame
    cameraDrawRef.current = {
      face: cameraFace,
      lensImage: activeLensImage,
      lensAnchor: activeLensAnchor,
    }
  }, [onFrame, cameraFace, activeLensImage, activeLensAnchor])

  useEffect(() => {
    if (!selectedModel?.overlayUrl) {
      return
    }
    const overlayUrl = selectedModel.overlayUrl
    let cancelled = false
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      if (!cancelled) setModelLensImage(image)
    }
    image.onerror = () => {
      if (!cancelled) setModelLensImage(null)
    }
    image.src = overlayUrl
    return () => {
      cancelled = true
    }
  }, [selectedModel?.id, selectedModel?.overlayUrl])

  useEffect(() => {
    if (mode !== 'photo') {
      return
    }
    const canvas = canvasRef.current
    if (
      !canvas ||
      !userPhoto ||
      !photoFace ||
      !isFaceFrontal(photoFace) ||
      !activeLensImage ||
      !activeLensAnchor
    ) {
      return
    }
    drawPhotoLensOnCanvas(
      canvas,
      userPhoto,
      photoFace,
      activeLensImage,
      activeLensAnchor,
      adjustValues,
    )
  }, [mode, userPhoto, photoFace, activeLensImage, activeLensAnchor, adjustValues])

  const visibleError = errorKey ?? cameraError
  const status = getTryOnStatus({
    mode,
    cameraReady,
    photoLoading,
    hasPhoto: Boolean(userPhoto && photoFace),
    cameraFace,
    errorKey: visibleError,
  })
  const cameraFailed = mode === 'camera' && cameraError === 'cameraUnavailable'
  const photoIsFrontal = Boolean(photoFace && isFaceFrontal(photoFace))
  const cameraFaceTurned = Boolean(cameraFace && !isFaceFrontal(cameraFace))
  const showCameraLens =
    mode === 'camera' &&
    Boolean(selectedModel?.overlayUrl && cameraFace && activeLensImage && activeLensAnchor) &&
    !cameraFaceTurned
  const faceHint: Extract<TryOnErrorKey, 'faceTurned'> | null =
    (mode === 'photo' && photoFace && !photoIsFrontal) || cameraFaceTurned
      ? 'faceTurned'
      : null
  const photoCaptureReady =
    mode === 'photo' && photoIsFrontal && Boolean(userPhoto && activeLensImage && activeLensAnchor)
  const cameraCaptureReady =
    mode === 'camera' && cameraReady && showCameraLens && Boolean(cameraFace && activeLensImage && activeLensAnchor)
  const sourceReady = photoCaptureReady || cameraCaptureReady
  const captureEnabled = (canCapture ?? true) && sourceReady && status !== 'error'

  function photoLensAdjust() {
    const photo = userPhoto
    if (!photo) return undefined
    const width = photo.naturalWidth || photo.width
    const height = photo.naturalHeight || photo.height
    const nudge = Math.max(width, height) * PHOTO_POSITION_UNIT
    return {
      ...adjustValues,
      dx: adjustValues.dx * nudge,
      dy: adjustValues.dy * nudge,
    }
  }

  function resolveCaptureCanvas(): HTMLCanvasElement {
    if (mode === 'photo' && userPhoto && photoFace && activeLensImage && activeLensAnchor) {
      const existing = canvasRef.current
      if (existing && existing.width > 0 && existing.height > 0) return existing
      const composed = document.createElement('canvas')
      drawCaptureFrame(composed, userPhoto, {
        image: activeLensImage,
        anchor: activeLensAnchor,
        face: photoFace,
        adjust: photoLensAdjust(),
      })
      return composed
    }

    const video = videoRef.current
    if (
      mode === 'camera' &&
      video &&
      cameraFace &&
      activeLensImage &&
      activeLensAnchor
    ) {
      const composed = document.createElement('canvas')
      drawCaptureFrame(composed, video, {
        image: activeLensImage,
        anchor: activeLensAnchor,
        face: cameraFace,
      })
      return composed
    }

    throw new Error('captureFailed')
  }

  async function handleCapture() {
    try {
      const blob = await captureResult(resolveCaptureCanvas())
      downloadCapture(blob, captureFilename(selectedModel?.nombre ?? 'lentes'))
      onCapture()
    } catch {
      setCameraError('captureFailed')
    }
  }

  function selectMode(next: TryOnMode) {
    setCameraError(null)
    setMode(next)
  }

  function dismissError() {
    setCameraError(null)
    onDismissError()
  }

  function retryCamera() {
    setCameraError(null)
    setCameraAttempt((n) => n + 1)
  }

  function handleSelectModel(id: number) {
    setInternalSelectedId(id)
    onSelectModel(id)
  }

  function rememberPhoto(image: HTMLImageElement) {
    if (photoUrlRef.current && photoUrlRef.current !== image.src) {
      URL.revokeObjectURL(photoUrlRef.current)
    }
    photoUrlRef.current = image.src.startsWith('blob:') ? image.src : null
    setUserPhoto(image)
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // permite elegir de nuevo el mismo archivo
    if (!file) return

    const seq = ++uploadSeqRef.current
    setPhotoLoading(true)
    try {
      const result = await validateImageFile(file)
      if (seq !== uploadSeqRef.current) return
      if (!result.valid) {
        setCameraError(result.error === 'format' ? 'unsupportedFormat' : 'invalidImage')
        return
      }

      const faceResult = await validateFaceInImage(result.image)
      if (seq !== uploadSeqRef.current) return
      if (!faceResult.valid) {
        setCameraError('invalidImage')
        return
      }

      setCameraError(null)
      rememberPhoto(result.image)
      setPhotoFace(faceResult.face)
      setInternalAdjust(DEFAULT_ADJUST)
      setMode('photo')
      onUploadPhoto(file)
      onPhotoFace(faceResult.face, result.image)
      if (
        canvasRef.current &&
        activeLensImage &&
        activeLensAnchor &&
        isFaceFrontal(faceResult.face)
      ) {
        drawPhotoLensOnCanvas(
          canvasRef.current,
          result.image,
          faceResult.face,
          activeLensImage,
          activeLensAnchor,
          adjustValues,
        )
      }
    } catch {
      if (seq !== uploadSeqRef.current) return
      setCameraError('invalidImage')
    } finally {
      if (seq === uploadSeqRef.current) setPhotoLoading(false)
    }
  }

  return (
    <section id="probador" className="section try-on">
      <div className="row">
        <nav className="breadcrumb" aria-label="Miga de pan">
          <a href="/catalogo">Inicio</a> / <a href="/catalogo">Catálogo</a> /{' '}
          Probador
        </nav>

        <header className="try-on__header">
          <h1>Probador virtual</h1>
          <p>
            Prueba aros con la cámara o con una foto. Tu video y tus fotos
            no se guardan en el servidor.
          </p>
        </header>

        <div className="try-on__mode" role="tablist" aria-label="Modo del probador">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'camera'}
            className={mode === 'camera' ? 'btn--filter is-active' : 'btn--filter'}
            onClick={() => selectMode('camera')}
          >
            Cámara
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'photo'}
            className={mode === 'photo' ? 'btn--filter is-active' : 'btn--filter'}
            onClick={() => selectMode('photo')}
          >
            Subir foto
          </button>
        </div>

        {/* Espacio de mensajes (A2, E1, E2, E3) */}
        <div className="try-on__messages" aria-live="polite">
          {status === 'error' && visibleError ? (
            <p className="notice notice--error" role="alert">
              {TRYON_MESSAGES[visibleError]}{' '}
              {cameraFailed ? (
                <button type="button" className="btn--link" onClick={retryCamera}>
                  Reintentar
                </button>
              ) : null}{' '}
              <button type="button" className="btn--link" onClick={dismissError}>
                Cerrar
              </button>
            </p>
          ) : status === 'faceNotDetected' ? (
            <p className="notice" role="status">
              {TRYON_MESSAGES.faceNotDetected}
            </p>
          ) : faceHint ? (
            <p className="notice" role="status">
              {TRYON_MESSAGES[faceHint]}
            </p>
          ) : status === 'loading' ? (
            <p className="notice">
              {photoLoading
                ? TRYON_STATUS_TEXT.loadingPhoto
                : TRYON_STATUS_TEXT.loadingCamera}
            </p>
          ) : null}
        </div>

        <div className="try-on__layout">
          <div className="try-on__stage-wrap">
            {/* <video> con <canvas> encima */}
            <div className="try-on__stage" data-mode={mode} data-status={status}>
              <video
                ref={videoRef}
                className="try-on__video"
                autoPlay
                playsInline
                muted
                hidden={mode !== 'camera'}
              />
              {userPhoto ? (
                <img
                  className="try-on__photo"
                  src={userPhoto.src}
                  alt="Fotografía cargada para el probador"
                  hidden={mode !== 'photo' || Boolean(photoIsFrontal && activeLensImage)}
                />
              ) : null}
              <canvas
                ref={canvasRef}
                className="try-on__canvas"
                hidden={
                  mode === 'photo'
                    ? !(photoIsFrontal && activeLensImage)
                    : !showCameraLens
                }
              />
            </div>

          </div>

          <aside className="try-on__sidebar">
            {mode === 'photo' ? (
              <ManualAdjustControls
                values={adjustValues}
                onChange={handleAdjustChange}
                disabled={!canAdjustLens}
              />
            ) : (
              <p className="try-on__camera-note notice" role="status">
                En modo cámara el ajuste es automático con la detección facial.
              </p>
            )}

            <div className="try-on__stage-actions">
              <button
                type="button"
                className={cameraFailed ? 'btn btn--highlight' : 'btn btn--outline'}
                onClick={() => fileInputRef.current?.click()}
              >
                Subir fotografía
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="visually-hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="try-on__capture">
              <button
                type="button"
                className="btn try-on__capture-btn"
                disabled={!captureEnabled}
                onClick={() => void handleCapture()}
              >
                Capturar imagen
              </button>
              <a
                className="btn"
                href={productId ? `/pago#${productId}` : '/catalogo'}
              >
                Comprar
              </a>
              <p className="try-on__capture-hint">
                La captura se descarga en tu dispositivo; no se envía al servidor.
              </p>
            </div>
          </aside>

          <ModelSelector
            models={models}
            selectedId={selectedId}
            onSelect={handleSelectModel}
          />
        </div>

        <p className="try-on__disclaimer">
          El probador es una referencia visual y no garantiza el ajuste físico
          del lente.
        </p>
      </div>
    </section>
  )
}
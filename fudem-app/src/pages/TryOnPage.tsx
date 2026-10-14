import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  ManualAdjustControls,
  type ManualAdjustValues,
} from '../components/ManualAdjustControls'
import {
  ModelSelector,
  type ModelSelectorProps,
} from '../components/ModelSelector'
import { requestCameraAccess, stopCamera } from '../lib/tryOn/cameraService'
import {
  validateFaceInImage,
  validateImageFile,
} from '../lib/tryOn/imageValidation'
import { computeLensTransform, drawLens } from '../lib/tryOn/lensTransform'
import { TRYON_MESSAGES } from '../lib/tryOn/messages'
import type { FaceData, LensAnchor, TryOnModel } from '../lib/tryOn/types'
import './TryOnPage.css'

export type TryOnMode = 'camera' | 'photo'
export type TryOnErrorKey = keyof typeof TRYON_MESSAGES

export type TryOnPageProps = {
  /** Si no se pasa, se lee de la ruta /probador#<idProducto> */
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
  /** T9: captura y descarga */
  onCapture?: () => void
  canCapture?: boolean
  /** Error controlado desde fuera (A2, E1, E3) */
  errorKey?: TryOnErrorKey | null
  onDismissError?: () => void
}

const DEFAULT_ADJUST: ManualAdjustValues = { dx: 0, dy: 0, scale: 1, rotation: 0 }
const noop = () => {}

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
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(photo, 0, 0, width, height)
  drawLens(
    ctx,
    lensImage,
    lensAnchor,
    computeLensTransform(face, lensAnchor, adjust),
  )
}

function readProductIdFromHash(): number | null {
  const raw = window.location.hash.replace(/^#/, '').trim()
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

export function TryOnPage({
  productId,
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
  canCapture = false,
  errorKey = null,
  onDismissError = noop,
}: TryOnPageProps) {
  const [hashId, setHashId] = useState<number | null>(readProductIdFromHash)
  const [mode, setMode] = useState<TryOnMode>('camera')
  const [cameraError, setCameraError] = useState<TryOnErrorKey | null>(null)
  const [cameraAttempt, setCameraAttempt] = useState(0)
  const [cameraReady, setCameraReady] = useState(false)
  const [userPhoto, setUserPhoto] = useState<HTMLImageElement | null>(null)
  const [photoFace, setPhotoFace] = useState<FaceData | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const onFrameRef = useRef(onFrame)
  const frameIdRef = useRef(0)
  const uploadSeqRef = useRef(0)
  const photoUrlRef = useRef<string | null>(null)

  onFrameRef.current = onFrame

  useEffect(() => {
    const onHashChange = () => setHashId(readProductIdFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    return () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    }
  }, [])

  // T3/T4: pedir la cámara cuando el modo es "camera"
  useEffect(() => {
    if (mode !== 'camera') {
      setCameraReady(false)
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
    if (mode !== 'camera' || !cameraReady) return

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

  useEffect(() => {
    if (mode !== 'photo' || !userPhoto || !photoFace || !lensImage || !lensAnchor) {
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    drawPhotoLensOnCanvas(
      canvas,
      userPhoto,
      photoFace,
      lensImage,
      lensAnchor,
      adjust,
    )
  }, [mode, userPhoto, photoFace, lensImage, lensAnchor, adjust])

  const currentProductId = productId !== undefined ? productId : hashId
  const selectedId = selectedModelId ?? currentProductId

  const visibleError = errorKey ?? cameraError
  const cameraFailed = mode === 'camera' && cameraError === 'cameraUnavailable'

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
      setMode('photo')
      onUploadPhoto(file)
      onPhotoFace(faceResult.face, result.image)
      if (canvasRef.current && lensImage && lensAnchor) {
        drawPhotoLensOnCanvas(
          canvasRef.current,
          result.image,
          faceResult.face,
          lensImage,
          lensAnchor,
          adjust,
        )
      }
    } catch {
      if (seq !== uploadSeqRef.current) return
      setCameraError('invalidImage')
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
            Prueba monturas con la cámara o con una foto. Tu video y tus fotos
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
          {visibleError ? (
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
          ) : null}
        </div>

        <div className="try-on__layout">
          <div className="try-on__stage-wrap">
            {/* <video> con <canvas> encima */}
            <div className="try-on__stage" data-mode={mode}>
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
                  hidden={mode !== 'photo'}
                />
              ) : null}
              <canvas ref={canvasRef} className="try-on__canvas" />
            </div>

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
          </div>

          <aside className="try-on__sidebar">
            <ModelSelector
              models={models}
              selectedId={selectedId}
              onSelect={onSelectModel}
            />

            {mode === 'photo' ? (
              <ManualAdjustControls
                values={adjust}
                onChange={onAdjustChange}
                disabled={!canCapture}
              />
            ) : (
              <p className="try-on__camera-note notice" role="status">
                En modo cámara el ajuste es automático con la detección facial.
              </p>
            )}

            <div className="try-on__capture">
              <button
                type="button"
                className="btn try-on__capture-btn"
                disabled={!canCapture || Boolean(visibleError)}
                onClick={onCapture}
              >
                Capturar resultado
              </button>
              <p className="try-on__capture-hint">
                La captura se descarga en tu dispositivo; no se envía al servidor.
              </p>
            </div>
          </aside>
        </div>

        <p className="try-on__disclaimer">
          El probador es una referencia visual y no garantiza el ajuste físico
          del lente.
        </p>
      </div>
    </section>
  )
}
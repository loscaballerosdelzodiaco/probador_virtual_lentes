import { useMemo, useState } from 'react'
import { ManualAdjustControls } from '../components/ManualAdjustControls'
import { ModelSelector } from '../components/ModelSelector'
import { TRYON_MESSAGES } from '../lib/tryOn/messages'
import type { TryOnModel } from '../lib/tryOn/types'

export type TryOnPageProps = {
  productId: number | null
}

type TryOnMode = 'camera' | 'photo'
type TryOnErrorKey = keyof typeof TRYON_MESSAGES | null

const MOCK_MODELS: TryOnModel[] = [
  {
    id: 1,
    nombre: 'Aro clásico',
    imageUrl: '/placeholder-lens.svg',
  },
  {
    id: 2,
    nombre: 'Aro redondo',
    imageUrl: '/placeholder-lens.svg',
  },
  {
    id: 3,
    nombre: 'Aro cuadrado',
    imageUrl: '/placeholder-lens.svg',
  },
]

const DEFAULT_ADJUST = {
  dx: 0,
  dy: 0,
  scale: 1,
  rotation: 0,
}

/**
 * Mockup HU3 / T1 — bloques: TryOnPage, ModelSelector, ManualAdjustControls.
 * Estados visibles: cámara activa, foto cargada, error.
 * Sin captura real ni persistencia de video/fotos del cliente.
 */
export function TryOnPage({ productId }: TryOnPageProps) {
  const initialId =
    productId && MOCK_MODELS.some((model) => model.id === productId)
      ? productId
      : (MOCK_MODELS[0]?.id ?? null)

  const [mode, setMode] = useState<TryOnMode>('camera')
  const [selectedId, setSelectedId] = useState<number | null>(initialId)
  const [photoPreview, setPhotoPreview] = useState(false)
  const [errorKey, setErrorKey] = useState<TryOnErrorKey>(null)
  const [adjust, setAdjust] = useState(DEFAULT_ADJUST)

  const selectedModel = useMemo(
    () => MOCK_MODELS.find((model) => model.id === selectedId) ?? null,
    [selectedId],
  )

  const showCameraStage = mode === 'camera' && !errorKey
  const showPhotoStage = mode === 'photo' && photoPreview && !errorKey

  function selectMode(next: TryOnMode) {
    setMode(next)
    setErrorKey(null)
    if (next === 'camera') {
      setPhotoPreview(false)
      setAdjust(DEFAULT_ADJUST)
    }
  }

  function handleMockPhoto() {
    setMode('photo')
    setPhotoPreview(true)
    setErrorKey(null)
  }

  function handleMockCameraError() {
    setMode('camera')
    setPhotoPreview(false)
    setErrorKey('cameraUnavailable')
  }

  function handleMockFaceError() {
    setErrorKey('faceNotDetected')
  }

  function handleMockFormatError() {
    setMode('photo')
    setPhotoPreview(false)
    setErrorKey('unsupportedFormat')
  }

  function clearError() {
    setErrorKey(null)
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
            Prueba monturas con la cámara o con una foto. Tu video y tus
            fotos no se guardan en el servidor.
          </p>
        </header>

        {/* Bloque: selector de modo (TryOnPage) */}
        <div
          className="try-on__mode"
          role="tablist"
          aria-label="Modo del probador"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'camera'}
            className={
              mode === 'camera' ? 'btn--filter is-active' : 'btn--filter'
            }
            onClick={() => selectMode('camera')}
          >
            Cámara
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'photo'}
            className={
              mode === 'photo' ? 'btn--filter is-active' : 'btn--filter'
            }
            onClick={() => selectMode('photo')}
          >
            Subir foto
          </button>
        </div>

        {/* Bloque: mensajes de error (TRYON_MESSAGES) */}
        {errorKey ? (
          <p className="notice notice--error" role="alert">
            {TRYON_MESSAGES[errorKey]}{' '}
            <button type="button" className="btn--link" onClick={clearError}>
              Cerrar
            </button>
          </p>
        ) : null}

        {/* Bloque: escenario / vista (TryOnPage) */}
        <div className="try-on__layout">
          <div className="try-on__stage-wrap">
            <div
              className={
                showCameraStage
                  ? 'try-on__stage try-on__stage--camera'
                  : showPhotoStage
                    ? 'try-on__stage try-on__stage--photo'
                    : 'try-on__stage try-on__stage--idle'
              }
              data-state={
                errorKey
                  ? 'error'
                  : showCameraStage
                    ? 'camera'
                    : showPhotoStage
                      ? 'photo'
                      : 'idle'
              }
            >
              {showCameraStage ? (
                <>
                  <div className="try-on__stage-label">Cámara activa</div>
                  <div className="try-on__stage-face" aria-hidden="true" />
                  {selectedModel ? (
                    <div
                      className="try-on__lens-ghost"
                      aria-hidden="true"
                      style={{
                        transform: `translate(-50%, -50%) scale(${adjust.scale}) rotate(${adjust.rotation}deg)`,
                      }}
                    >
                      <img src={selectedModel.imageUrl} alt="" />
                    </div>
                  ) : null}
                  <p className="try-on__stage-caption">
                    Vista en vivo · detección facial (próximas tareas)
                  </p>
                </>
              ) : null}

              {showPhotoStage ? (
                <>
                  <div className="try-on__stage-label">Foto cargada</div>
                  <div className="try-on__stage-face try-on__stage-face--photo" aria-hidden="true" />
                  {selectedModel ? (
                    <div
                      className="try-on__lens-ghost"
                      aria-hidden="true"
                      style={{
                        transform: `translate(calc(-50% + ${adjust.dx}px), calc(-50% + ${adjust.dy}px)) scale(${adjust.scale}) rotate(${adjust.rotation}deg)`,
                      }}
                    >
                      <img src={selectedModel.imageUrl} alt="" />
                    </div>
                  ) : null}
                  <p className="try-on__stage-caption">
                    Ajusta la montura con los controles
                  </p>
                </>
              ) : null}

              {!showCameraStage && !showPhotoStage && !errorKey ? (
                <div className="try-on__stage-empty">
                  <p>
                    {mode === 'photo'
                      ? 'Sube una foto frontal para probar los lentes.'
                      : 'Activa la cámara para comenzar.'}
                  </p>
                </div>
              ) : null}

              {errorKey ? (
                <div className="try-on__stage-empty">
                  <p>No hay vista disponible mientras haya un error.</p>
                </div>
              ) : null}
            </div>

            {/* Acciones de escenario (TryOnPage) */}
            <div className="try-on__stage-actions">
              {mode === 'camera' ? (
                <>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setErrorKey(null)
                      setPhotoPreview(false)
                    }}
                  >
                    Activar cámara
                  </button>
                  <button
                    type="button"
                    className="btn btn--outline"
                    onClick={handleMockCameraError}
                  >
                    Simular error de cámara
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleMockPhoto}
                  >
                    Usar foto de ejemplo
                  </button>
                  <label className="btn btn--outline try-on__file-label">
                    Elegir archivo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="visually-hidden"
                      onChange={() => {
                        /* Mockup: no lee ni sube el archivo al servidor */
                        handleMockPhoto()
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn--outline"
                    onClick={handleMockFormatError}
                  >
                    Simular formato inválido
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn btn--outline"
                onClick={handleMockFaceError}
              >
                Simular rostro no detectado
              </button>
            </div>
          </div>

          <aside className="try-on__sidebar">
            {/* Bloque: ModelSelector */}
            <ModelSelector
              models={MOCK_MODELS}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            {/* Bloque: ManualAdjustControls (modo foto) */}
            {mode === 'photo' ? (
              <ManualAdjustControls
                values={adjust}
                onChange={setAdjust}
                disabled={!photoPreview || Boolean(errorKey)}
              />
            ) : (
              <p className="try-on__camera-note notice" role="status">
                En modo cámara el ajuste es automático con la detección
                facial.
              </p>
            )}

            {/* Bloque: captura (TryOnPage) */}
            <div className="try-on__capture">
              <button
                type="button"
                className="btn try-on__capture-btn"
                disabled={Boolean(errorKey) || (mode === 'photo' && !photoPreview)}
              >
                Capturar resultado
              </button>
              <p className="try-on__capture-hint">
                La captura se descarga en tu dispositivo; no se envía al
                servidor.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}

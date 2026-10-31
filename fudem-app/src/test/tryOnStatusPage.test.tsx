import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requestCameraAccess } from '../lib/tryOn/cameraService'
import { detectFace } from '../lib/tryOn/faceDetector'
import { TRYON_MESSAGES, TRYON_STATUS_TEXT } from '../lib/tryOn/messages'
import { TryOnPage } from '../pages/TryOnPage'

vi.mock('../lib/tryOn/cameraService', () => ({
  requestCameraAccess: vi.fn(),
  stopCamera: vi.fn(),
}))

vi.mock('../lib/tryOn/faceDetector', () => ({
  detectFace: vi.fn(),
}))

const frontalFace = {
  leftEye: { x: 40, y: 50 },
  rightEye: { x: 80, y: 50 },
  yaw: 0,
}

class ImmediateImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  private currentSrc = ''
  set src(value: string) {
    this.currentSrc = value
    queueMicrotask(() => this.onload?.())
  }
  get src() {
    return this.currentSrc
  }
}

function fakeStream() {
  return { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream
}

function stage() {
  return document.querySelector('.try-on__stage') as HTMLElement
}

describe('TryOnPage estados (T13)', () => {
  let frameCallback: FrameRequestCallback | null = null

  beforeEach(() => {
    frameCallback = null
    vi.mocked(requestCameraAccess).mockReset()
    vi.mocked(detectFace).mockReset()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frameCallback = cb
      return 7
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function startCameraWithFrame() {
    vi.mocked(requestCameraAccess).mockResolvedValue({ ok: true, stream: fakeStream() })
    render(<TryOnPage />)
    const video = document.querySelector('video') as HTMLVideoElement
    await waitFor(() => expect(video.srcObject).not.toBeNull())
    Object.defineProperty(video, 'readyState', {
      configurable: true,
      get: () => HTMLMediaElement.HAVE_CURRENT_DATA,
    })
    Object.defineProperty(video, 'videoWidth', { configurable: true, get: () => 640 })
    await waitFor(() => expect(frameCallback).not.toBeNull())
    frameCallback?.(0)
  }

  it('muestra "cargando" mientras se pide la cámara', async () => {
    vi.mocked(requestCameraAccess).mockReturnValue(new Promise(() => {}))
    render(<TryOnPage />)

    expect(await screen.findByText(TRYON_STATUS_TEXT.loadingCamera)).toBeInTheDocument()
    expect(stage()).toHaveAttribute('data-status', 'loading')
  })

  it('cámara activa con rostro: sin mensajes de error ni de rostro', async () => {
    vi.mocked(detectFace).mockResolvedValue(frontalFace)
    await startCameraWithFrame()

    await waitFor(() => expect(stage()).toHaveAttribute('data-status', 'camera'))
    expect(screen.queryByText(TRYON_STATUS_TEXT.loadingCamera)).toBeNull()
    expect(screen.queryByText(TRYON_MESSAGES.faceNotDetected)).toBeNull()
  })

  it('cámara activa sin rostro: muestra faceNotDetected', async () => {
    vi.mocked(detectFace).mockResolvedValue(null)
    await startCameraWithFrame()

    expect(await screen.findByText(TRYON_MESSAGES.faceNotDetected)).toBeInTheDocument()
    expect(stage()).toHaveAttribute('data-status', 'faceNotDetected')
  })

  it('error de cámara: estado error con el mensaje de TRYON_MESSAGES', async () => {
    vi.mocked(requestCameraAccess).mockResolvedValue({ ok: false, reason: 'denied' })
    render(<TryOnPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(TRYON_MESSAGES.cameraUnavailable)
    expect(stage()).toHaveAttribute('data-status', 'error')
  })

  it('foto: "cargando" mientras se procesa y "foto cargada" al terminar', async () => {
    vi.stubGlobal('Image', ImmediateImage)
    vi.mocked(requestCameraAccess).mockResolvedValue({ ok: true, stream: fakeStream() })
    let resolveFace: (value: typeof frontalFace) => void = () => {}
    vi.mocked(detectFace).mockReturnValue(
      new Promise((resolve) => {
        resolveFace = resolve
      }),
    )
    render(<TryOnPage />)
    const video = document.querySelector('video') as HTMLVideoElement
    await waitFor(() => expect(video.srcObject).not.toBeNull())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, new File(['jpeg'], 'foto.jpg', { type: 'image/jpeg' }))

    expect(await screen.findByText(TRYON_STATUS_TEXT.loadingPhoto)).toBeInTheDocument()
    expect(stage()).toHaveAttribute('data-status', 'loading')

    resolveFace(frontalFace)
    await waitFor(() => expect(stage()).toHaveAttribute('data-status', 'photo'))
    expect(screen.queryByText(TRYON_STATUS_TEXT.loadingPhoto)).toBeNull()
  })

  it('enlaza Comprar con el pago del producto', async () => {
    vi.mocked(requestCameraAccess).mockReturnValue(new Promise(() => {}))
    render(<TryOnPage productId={4} />)
    expect(await screen.findByRole('link', { name: 'Comprar' })).toHaveAttribute(
      'href',
      '/pago#4',
    )
  })
})

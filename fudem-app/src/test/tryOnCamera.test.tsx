import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TryOnPage } from '../pages/TryOnPage'
import { requestCameraAccess, stopCamera } from '../lib/tryOn/cameraService'
import { TRYON_MESSAGES } from '../lib/tryOn/messages'

vi.mock('../lib/tryOn/cameraService', () => ({
  requestCameraAccess: vi.fn(),
  stopCamera: vi.fn(),
}))

vi.mock('../lib/tryOn/faceDetector', () => ({
  detectFace: vi.fn(async () => ({
    leftEye: { x: 40, y: 50 },
    rightEye: { x: 80, y: 50 },
    yaw: 0,
  })),
}))

function fakeStream() {
  return { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream
}

describe('TryOnPage cámara (T4)', () => {
  let frameCallback: FrameRequestCallback | null = null

  beforeEach(() => {
    frameCallback = null
    vi.mocked(requestCameraAccess).mockReset()
    vi.mocked(stopCamera).mockReset()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frameCallback = cb
      return 7
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('asigna el stream al video y llama onFrame cuando hay un frame listo', async () => {
    const stream = fakeStream()
    vi.mocked(requestCameraAccess).mockResolvedValue({ ok: true, stream })
    const onFrame = vi.fn()

    const { unmount } = render(<TryOnPage onFrame={onFrame} />)
    const video = document.querySelector('video') as HTMLVideoElement

    await waitFor(() => {
      expect(video.srcObject).toBe(stream)
    })
    expect(video.autoplay).toBe(true)
    expect(video.muted).toBe(true)
    expect(video.playsInline).toBe(true)

    Object.defineProperty(video, 'readyState', {
      configurable: true,
      get: () => HTMLMediaElement.HAVE_CURRENT_DATA,
    })
    Object.defineProperty(video, 'videoWidth', {
      configurable: true,
      get: () => 640,
    })

    await waitFor(() => {
      expect(frameCallback).not.toBeNull()
    })
    frameCallback?.(0)
    expect(onFrame).toHaveBeenCalledTimes(1)
    expect(onFrame).toHaveBeenCalledWith(video)

    unmount()
    expect(stopCamera).toHaveBeenCalledWith(stream)
    expect(cancelAnimationFrame).toHaveBeenCalled()
  })

  it('no inicia el bucle de frames si la cámara no está disponible', async () => {
    vi.mocked(requestCameraAccess).mockResolvedValue({
      ok: false,
      reason: 'denied',
    })
    const onFrame = vi.fn()

    render(<TryOnPage onFrame={onFrame} />)

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(TRYON_MESSAGES.cameraUnavailable)
    expect(frameCallback).toBeNull()
    expect(onFrame).not.toHaveBeenCalled()
  })

  it('detiene la cámara al pasar a modo foto', async () => {
    const stream = fakeStream()
    vi.mocked(requestCameraAccess).mockResolvedValue({ ok: true, stream })

    render(<TryOnPage />)
    await waitFor(() => {
      expect(document.querySelector('video')?.srcObject).toBe(stream)
    })

    await userEvent.setup().click(screen.getByRole('tab', { name: 'Subir foto' }))

    await waitFor(() => {
      expect(stopCamera).toHaveBeenCalledWith(stream)
    })
  })
})

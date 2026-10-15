import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TryOnPage } from '../pages/TryOnPage'
import { requestCameraAccess, stopCamera } from '../lib/tryOn/cameraService'
import { detectFace } from '../lib/tryOn/faceDetector'
import { drawLens } from '../lib/tryOn/lensTransform'
import { TRYON_MESSAGES } from '../lib/tryOn/messages'
import type { TryOnModel } from '../lib/tryOn/types'

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

vi.mock('../lib/tryOn/lensTransform', async () => {
  const actual = await vi.importActual<typeof import('../lib/tryOn/lensTransform')>(
    '../lib/tryOn/lensTransform',
  )
  return {
    ...actual,
    drawLens: vi.fn(actual.drawLens),
  }
})

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
    expect(stopCamera).not.toHaveBeenCalled()
  })

  it('Reintentar vuelve a pedir la cámara después de una denegación (E2)', async () => {
    const stream = fakeStream()
    vi.mocked(requestCameraAccess)
      .mockResolvedValueOnce({ ok: false, reason: 'denied' })
      .mockResolvedValueOnce({ ok: true, stream })
    const onFrame = vi.fn()

    render(<TryOnPage onFrame={onFrame} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(TRYON_MESSAGES.cameraUnavailable)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => {
      expect(document.querySelector('video')?.srcObject).toBe(stream)
    })
    expect(requestCameraAccess).toHaveBeenCalledTimes(2)
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

  it('redibuja el lente sobre los ojos cuando la cara se mueve', async () => {
    class SizedImage {
      onload: (() => void) | null = null
      complete = true
      width = 300
      height = 120
      naturalWidth = 300
      naturalHeight = 120
      private currentSrc = ''
      set src(value: string) {
        this.currentSrc = value
        queueMicrotask(() => this.onload?.())
      }
      get src() {
        return this.currentSrc
      }
    }
    vi.stubGlobal('Image', SizedImage)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          clearRect: vi.fn(),
          drawImage: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
          translate: vi.fn(),
          rotate: vi.fn(),
          getImageData: () => {
            const data = new Uint8ClampedArray(300 * 120 * 4)
            data.fill(255)
            return { data, width: 300, height: 120 }
          },
        }) as unknown as CanvasRenderingContext2D,
    )
    const models: TryOnModel[] = [
      {
        id: 1,
        nombre: 'AN7225',
        marca: 'Arnette',
        imageUrl: '/catalog/ARNETTEAN7225.webp',
        overlayUrl: '/tryon/ARNETTEAN7225.webp',
      },
    ]
    vi.mocked(detectFace)
      .mockResolvedValueOnce({
        leftEye: { x: 100, y: 80 },
        rightEye: { x: 180, y: 80 },
        yaw: 0,
      })
      .mockResolvedValue({
        leftEye: { x: 140, y: 90 },
        rightEye: { x: 220, y: 90 },
        yaw: 0,
      })
    const stream = fakeStream()
    vi.mocked(requestCameraAccess).mockResolvedValue({ ok: true, stream })

    render(<TryOnPage models={models} />)
    const video = document.querySelector('video') as HTMLVideoElement
    await waitFor(() => expect(video.srcObject).toBe(stream))
    Object.defineProperty(video, 'readyState', {
      configurable: true,
      get: () => HTMLMediaElement.HAVE_CURRENT_DATA,
    })
    Object.defineProperty(video, 'videoWidth', { configurable: true, get: () => 640 })
    Object.defineProperty(video, 'videoHeight', { configurable: true, get: () => 480 })

    await waitFor(() => expect(frameCallback).not.toBeNull())
    frameCallback?.(0)
    await waitFor(() => expect(detectFace).toHaveBeenCalled())
    frameCallback?.(0)
    await waitFor(() => expect(drawLens).toHaveBeenCalled())
    const first = vi.mocked(drawLens).mock.calls.at(-1)?.[3]
    expect(first?.x).toBe(140)

    vi.mocked(detectFace).mockResolvedValue({
      leftEye: { x: 140, y: 90 },
      rightEye: { x: 220, y: 90 },
      yaw: 0,
    })
    await waitFor(() => {
      frameCallback?.(0)
      const next = vi.mocked(drawLens).mock.calls.at(-1)?.[3]
      expect(next?.x).toBe(180)
    })
    expect(document.querySelector('canvas')).not.toHaveAttribute('hidden')
  })
})

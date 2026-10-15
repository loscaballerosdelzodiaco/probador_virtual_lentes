import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TryOnPage } from '../pages/TryOnPage'
import { requestCameraAccess } from '../lib/tryOn/cameraService'
import { detectFace } from '../lib/tryOn/faceDetector'
import { captureResult, downloadCapture } from '../lib/tryOn/captureService'
import type { TryOnModel } from '../lib/tryOn/types'

vi.mock('../lib/tryOn/cameraService', () => ({
  requestCameraAccess: vi.fn(),
  stopCamera: vi.fn(),
}))

vi.mock('../lib/tryOn/faceDetector', () => ({
  detectFace: vi.fn(),
}))

vi.mock('../lib/tryOn/captureService', async () => {
  const actual = await vi.importActual<typeof import('../lib/tryOn/captureService')>(
    '../lib/tryOn/captureService',
  )
  return {
    ...actual,
    captureResult: vi.fn(),
    downloadCapture: vi.fn(),
  }
})

const models: TryOnModel[] = [
  {
    id: 1,
    nombre: 'AN7225',
    marca: 'Arnette',
    imageUrl: '/catalog/ARNETTEAN7225.webp',
    overlayUrl: '/tryon/ARNETTEAN7225.webp',
  },
]

const sampleFace = {
  leftEye: { x: 40, y: 50 },
  rightEye: { x: 80, y: 50 },
  yaw: 0,
}

class ImmediateImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  complete = true
  width = 400
  height = 300
  naturalWidth = 400
  naturalHeight = 300
  private currentSrc = ''

  set src(value: string) {
    this.currentSrc = value
    queueMicrotask(() => this.onload?.())
  }

  get src() {
    return this.currentSrc
  }
}

describe('TryOnPage captura (T14)', () => {
  beforeEach(() => {
    vi.mocked(captureResult).mockReset()
    vi.mocked(downloadCapture).mockReset()
    vi.mocked(detectFace).mockReset()
    vi.mocked(detectFace).mockResolvedValue(sampleFace)
    vi.mocked(requestCameraAccess).mockReset()
    vi.mocked(requestCameraAccess).mockResolvedValue({
      ok: false,
      reason: 'unavailable',
    })
    vi.mocked(captureResult).mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
  })

  it('muestra Capturar imagen y no descarga al cargar ni al cambiar de modelo', async () => {
    vi.stubGlobal('Image', ImmediateImage)
    render(<TryOnPage models={models} />)

    expect(screen.getByRole('button', { name: 'Capturar imagen' })).toBeInTheDocument()
    expect(downloadCapture).not.toHaveBeenCalled()
    expect(captureResult).not.toHaveBeenCalled()

    await userEvent.setup().click(screen.getByRole('button', { name: 'AN7225, Arnette' }))
    expect(downloadCapture).not.toHaveBeenCalled()
  })

  it('descarga probador-<modelo>.png solo al pulsar Capturar imagen', async () => {
    vi.stubGlobal('Image', ImmediateImage)
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
            const data = new Uint8ClampedArray(400 * 300 * 4)
            data.fill(255)
            return { data, width: 400, height: 300 }
          },
        }) as unknown as CanvasRenderingContext2D,
    )

    render(<TryOnPage models={models} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, new File(['jpeg'], 'cara.jpg', { type: 'image/jpeg' }))
    await screen.findByAltText('Fotografía cargada para el probador', { hidden: true })

    const capture = await screen.findByRole('button', { name: 'Capturar imagen' })
    await waitFor(() => {
      expect(capture).toBeEnabled()
    })

    expect(downloadCapture).not.toHaveBeenCalled()
    await userEvent.click(capture)

    await waitFor(() => {
      expect(captureResult).toHaveBeenCalledTimes(1)
      expect(downloadCapture).toHaveBeenCalledTimes(1)
    })
    expect(downloadCapture).toHaveBeenCalledWith(
      expect.any(Blob),
      'probador-an7225.png',
    )
  })

  it('muestra error si la captura falla', async () => {
    vi.stubGlobal('Image', ImmediateImage)
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
            const data = new Uint8ClampedArray(400 * 300 * 4)
            data.fill(255)
            return { data, width: 400, height: 300 }
          },
        }) as unknown as CanvasRenderingContext2D,
    )
    vi.mocked(captureResult).mockRejectedValue(new Error('blob'))

    render(<TryOnPage models={models} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, new File(['jpeg'], 'cara.jpg', { type: 'image/jpeg' }))
    const capture = await screen.findByRole('button', { name: 'Capturar imagen' })
    await waitFor(() => expect(capture).toBeEnabled())
    await userEvent.click(capture)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo capturar el resultado. Inténtalo de nuevo.',
    )
    expect(downloadCapture).not.toHaveBeenCalled()
  })
})

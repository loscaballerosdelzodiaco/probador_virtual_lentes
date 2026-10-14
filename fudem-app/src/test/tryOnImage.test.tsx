import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { detectFace } from '../lib/tryOn/faceDetector'
import { TRYON_MESSAGES } from '../lib/tryOn/messages'
import { TryOnPage } from '../pages/TryOnPage'
import { requestCameraAccess } from '../lib/tryOn/cameraService'

vi.mock('../lib/tryOn/cameraService', () => ({
  requestCameraAccess: vi.fn(),
  stopCamera: vi.fn(),
}))

vi.mock('../lib/tryOn/faceDetector', () => ({
  detectFace: vi.fn(),
}))

const sampleFace = {
  leftEye: { x: 40, y: 50 },
  rightEye: { x: 80, y: 50 },
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

describe('TryOnPage imagen (E3 / E1)', () => {
  beforeEach(() => {
    vi.mocked(detectFace).mockReset()
    vi.mocked(detectFace).mockResolvedValue(sampleFace)
  })

  it('muestra el mensaje de formato no admitido y no entrega el archivo', async () => {
    vi.mocked(requestCameraAccess).mockResolvedValue({
      ok: false,
      reason: 'unavailable',
    })
    const onUploadPhoto = vi.fn()
    render(<TryOnPage onUploadPhoto={onUploadPhoto} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const gif = new File(['gif'], 'foto.gif', { type: 'image/gif' })
    Object.defineProperty(input, 'files', { configurable: true, value: [gif] })
    fireEvent.change(input)

    expect(await screen.findByText(TRYON_MESSAGES.unsupportedFormat)).toBeInTheDocument()
    expect(onUploadPhoto).not.toHaveBeenCalled()
    expect(screen.queryByRole('img', { name: 'Fotografía cargada para el probador' })).toBeNull()
  })

  it('carga una imagen JPG válida en un elemento de imagen', async () => {
    vi.stubGlobal('Image', ImmediateImage)
    vi.mocked(requestCameraAccess).mockResolvedValue({
      ok: false,
      reason: 'unavailable',
    })
    const onUploadPhoto = vi.fn()
    render(<TryOnPage onUploadPhoto={onUploadPhoto} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const photo = new File(['jpeg'], 'foto.jpg', { type: 'image/jpeg' })
    await userEvent.upload(input, photo)

    const image = await screen.findByRole('img', { name: 'Fotografía cargada para el probador' })
    expect(image).toBeInstanceOf(HTMLImageElement)
    expect(image).toHaveAttribute('src', expect.stringMatching(/^blob:/))
    expect(onUploadPhoto).toHaveBeenCalledWith(photo)
    expect(screen.queryByText(TRYON_MESSAGES.unsupportedFormat)).toBeNull()
  })

  it('bloquea una foto sin rostro y muestra invalidImage', async () => {
    vi.stubGlobal('Image', ImmediateImage)
    vi.mocked(detectFace).mockResolvedValue(null)
    vi.mocked(requestCameraAccess).mockResolvedValue({
      ok: false,
      reason: 'unavailable',
    })
    const onUploadPhoto = vi.fn()
    const onPhotoFace = vi.fn()
    render(<TryOnPage onUploadPhoto={onUploadPhoto} onPhotoFace={onPhotoFace} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const photo = new File(['jpeg'], 'sin-cara.jpg', { type: 'image/jpeg' })
    await userEvent.upload(input, photo)

    expect(await screen.findByText(TRYON_MESSAGES.invalidImage)).toBeInTheDocument()
    expect(onUploadPhoto).not.toHaveBeenCalled()
    expect(onPhotoFace).not.toHaveBeenCalled()
    expect(screen.queryByRole('img', { name: 'Fotografía cargada para el probador' })).toBeNull()
  })

  it('pasa el FaceData de una foto con rostro a T6 sin volver a detectar', async () => {
    vi.stubGlobal('Image', ImmediateImage)
    vi.mocked(requestCameraAccess).mockResolvedValue({
      ok: false,
      reason: 'unavailable',
    })
    const onPhotoFace = vi.fn()
    render(<TryOnPage onPhotoFace={onPhotoFace} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const photo = new File(['jpeg'], 'con-cara.jpg', { type: 'image/jpeg' })
    await userEvent.upload(input, photo)

    expect(await screen.findByRole('img', { name: 'Fotografía cargada para el probador' })).toBeInTheDocument()
    expect(onPhotoFace).toHaveBeenCalledTimes(1)
    expect(onPhotoFace.mock.calls[0][0]).toEqual(sampleFace)
    expect(detectFace).toHaveBeenCalledTimes(1)
  })

  it('muestra invalidImage si la detección facial falla', async () => {
    vi.stubGlobal('Image', ImmediateImage)
    vi.mocked(detectFace).mockRejectedValue(new Error('wasm'))
    vi.mocked(requestCameraAccess).mockResolvedValue({
      ok: false,
      reason: 'unavailable',
    })
    const onUploadPhoto = vi.fn()
    render(<TryOnPage onUploadPhoto={onUploadPhoto} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, new File(['jpeg'], 'foto.jpg', { type: 'image/jpeg' }))

    expect(await screen.findByText(TRYON_MESSAGES.invalidImage)).toBeInTheDocument()
    expect(onUploadPhoto).not.toHaveBeenCalled()
  })
})

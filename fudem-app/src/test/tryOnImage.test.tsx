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

  it('permite mover, escalar y rotar el lente sobre una foto con rostro', async () => {
    vi.stubGlobal('Image', ImmediateImage)
    vi.mocked(requestCameraAccess).mockResolvedValue({
      ok: false,
      reason: 'unavailable',
    })
    const onAdjustChange = vi.fn()
    const user = userEvent.setup()
    render(<TryOnPage onAdjustChange={onAdjustChange} />)

    expect(screen.queryByLabelText('Mover derecha')).not.toBeInTheDocument()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, new File(['jpeg'], 'cara.jpg', { type: 'image/jpeg' }))
    await screen.findByRole('img', { name: 'Fotografía cargada para el probador' })

    const moveRight = screen.getByRole('button', { name: 'Mover derecha' })
    expect(moveRight).toBeEnabled()
    await user.click(moveRight)
    expect(onAdjustChange).toHaveBeenCalledWith(
      expect.objectContaining({ dx: 1, dy: 0, scale: 1, rotation: 0 }),
    )

    await user.click(screen.getByRole('slider', { name: 'Tamaño' }))
    expect(screen.getByRole('slider', { name: 'Tamaño' })).toBeEnabled()
    expect(screen.getByRole('slider', { name: 'Rotación' })).toBeEnabled()
  })

  it('coloca el ajuste, luego subir foto y los modelos debajo', async () => {
    vi.mocked(requestCameraAccess).mockResolvedValue({
      ok: false,
      reason: 'unavailable',
    })
    const user = userEvent.setup()
    render(<TryOnPage />)

    await user.click(screen.getByRole('tab', { name: 'Subir foto' }))

    const adjust = screen.getByRole('heading', { name: 'Ajuste manual' })
    const upload = screen.getByRole('button', { name: 'Subir fotografía' })
    const models = screen.getByRole('heading', { name: 'Modelos' })
    expect(adjust.compareDocumentPosition(upload) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(upload.compareDocumentPosition(models) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('al volver a cámara oculta la foto y deja ver el video', async () => {
    vi.stubGlobal('Image', ImmediateImage)
    vi.mocked(requestCameraAccess).mockResolvedValue({
      ok: false,
      reason: 'unavailable',
    })
    const user = userEvent.setup()
    render(<TryOnPage />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, new File(['jpeg'], 'cara.jpg', { type: 'image/jpeg' }))
    await screen.findByRole('img', { name: 'Fotografía cargada para el probador' })

    await user.click(screen.getByRole('tab', { name: 'Cámara' }))

    const photo = screen.getByAltText('Fotografía cargada para el probador')
    expect(photo).not.toBeVisible()
    expect(document.querySelector('video')).not.toHaveAttribute('hidden')
    expect(document.querySelector('canvas')).toHaveAttribute('hidden')
  })

  it('no dibuja el lente sobre una foto si la cara no está de frente', async () => {
    vi.stubGlobal('Image', ImmediateImage)
    vi.mocked(detectFace).mockResolvedValue({
      leftEye: { x: 40, y: 50 },
      rightEye: { x: 80, y: 50 },
      yaw: 0.8,
    })
    vi.mocked(requestCameraAccess).mockResolvedValue({
      ok: false,
      reason: 'unavailable',
    })
    render(
      <TryOnPage
        models={[
          {
            id: 1,
            nombre: 'AN7225',
            marca: 'Arnette',
            imageUrl: '/catalog/ARNETTEAN7225.webp',
            overlayUrl: '/tryon/ARNETTEAN7225.webp',
          },
        ]}
      />,
    )

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, new File(['jpeg'], 'perfil.jpg', { type: 'image/jpeg' }))

    expect(await screen.findByText(TRYON_MESSAGES.faceTurned)).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Fotografía cargada para el probador' }),
    ).toBeInTheDocument()
  })
})

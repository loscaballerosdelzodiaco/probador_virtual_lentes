import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TRYON_MESSAGES } from '../lib/tryOn/messages'
import { TryOnPage } from '../pages/TryOnPage'
import { requestCameraAccess } from '../lib/tryOn/cameraService'

vi.mock('../lib/tryOn/cameraService', () => ({
  requestCameraAccess: vi.fn(),
  stopCamera: vi.fn(),
}))

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

describe('TryOnPage imagen (E3)', () => {
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
})

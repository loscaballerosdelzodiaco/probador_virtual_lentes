import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ModelSelector } from '../components/ModelSelector'
import { brandFromCatalogFile } from '../lib/catalogImage'
import { detectFace } from '../lib/tryOn/faceDetector'
import { toTryOnModel } from '../lib/tryOn/models'
import type { TryOnModel } from '../lib/tryOn/types'
import { requestCameraAccess, stopCamera } from '../lib/tryOn/cameraService'
import { drawLens } from '../lib/tryOn/lensTransform'
import { TryOnPage } from '../pages/TryOnPage'

vi.mock('../lib/tryOn/cameraService', () => ({
  requestCameraAccess: vi.fn(),
  stopCamera: vi.fn(),
}))

vi.mock('../lib/tryOn/faceDetector', () => ({
  detectFace: vi.fn(),
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

const models: TryOnModel[] = [
  {
    id: 1,
    nombre: 'AN7225',
    marca: 'Arnette',
    imageUrl: '/catalog/ARNETTEAN7225.webp',
  },
  {
    id: 2,
    nombre: '1432',
    marca: 'Boss',
    imageUrl: '/catalog/BOSS14322M2.webp',
  },
]

class SizedImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
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

function fakeStream() {
  return { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream
}

describe('brandFromCatalogFile', () => {
  it('reconoce la marca en el nombre de archivo del catálogo', () => {
    expect(brandFromCatalogFile('ARNETTEAN7225.webp')).toBe('Arnette')
    expect(brandFromCatalogFile('/catalog/BOSS14322M2.webp')).toBe('Boss')
    expect(brandFromCatalogFile('CHLOGAN9120.webp')).toBe('Chloé')
  })
})

describe('toTryOnModel', () => {
  it('arma miniatura, nombre y marca', () => {
    expect(
      toTryOnModel({
        id: 4,
        nombre: ' AN7225 ',
        precio: 80,
        sku: 'ARNETTEAN7225',
        material: 'Acetato',
        color: 'Negro',
        medidas: null,
        categoria: 'Hombre',
        url_imagen: 'ARNETTEAN7225.webp',
        disponible: true,
      }),
    ).toEqual({
      id: 4,
      nombre: 'AN7225',
      marca: 'Arnette',
      imageUrl: '/catalog/ARNETTEAN7225.webp',
    })
  })
})

describe('ModelSelector', () => {
  it('muestra miniatura, nombre, marca y resalta el modelo elegido', async () => {
    const onSelect = vi.fn()
    render(<ModelSelector models={models} selectedId={1} onSelect={onSelect} />)

    const arnette = screen.getByRole('button', { name: 'AN7225, Arnette' })
    const boss = screen.getByRole('button', { name: '1432, Boss' })

    expect(arnette.querySelector('img')).toHaveAttribute('src', models[0].imageUrl)
    expect(boss.querySelector('img')).toHaveAttribute('src', models[1].imageUrl)
    expect(arnette).toHaveClass('is-selected')
    expect(boss).not.toHaveClass('is-selected')
    expect(screen.getByRole('option', { name: 'AN7225, Arnette' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await userEvent.setup().click(boss)
    expect(onSelect).toHaveBeenCalledWith(2)
  })
})

describe('TryOnPage selección de modelo', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(requestCameraAccess).mockReset()
    vi.mocked(stopCamera).mockReset()
    vi.mocked(detectFace).mockReset()
    vi.mocked(detectFace).mockResolvedValue({
      leftEye: { x: 40, y: 50 },
      rightEye: { x: 80, y: 50 },
    })
  })

  it('cambia la imagen del lente en cámara sin reiniciar el stream', async () => {
    const stream = fakeStream()
    vi.mocked(requestCameraAccess).mockResolvedValue({ ok: true, stream })

    render(<TryOnPage models={models} />)
    const video = document.querySelector('video') as HTMLVideoElement

    await waitFor(() => {
      expect(video.srcObject).toBe(stream)
    })
    const cameraCalls = vi.mocked(requestCameraAccess).mock.calls.length
    const stopCalls = vi.mocked(stopCamera).mock.calls.length

    expect(document.querySelector('.try-on__lens-ghost img')).toHaveAttribute(
      'src',
      models[0].imageUrl,
    )

    await userEvent.setup().click(screen.getByRole('button', { name: '1432, Boss' }))

    expect(document.querySelector('.try-on__lens-ghost img')).toHaveAttribute(
      'src',
      models[1].imageUrl,
    )
    expect(screen.getByRole('button', { name: '1432, Boss' })).toHaveClass('is-selected')
    expect(video.srcObject).toBe(stream)
    expect(requestCameraAccess).toHaveBeenCalledTimes(cameraCalls)
    expect(stopCamera).toHaveBeenCalledTimes(stopCalls)
  })

  it('conserva la foto cargada y dibuja el lente del modelo nuevo', async () => {
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
        }) as unknown as CanvasRenderingContext2D,
    )
    vi.mocked(requestCameraAccess).mockResolvedValue({
      ok: false,
      reason: 'unavailable',
    })

    render(<TryOnPage models={models} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const photo = new File(['jpeg'], 'foto.jpg', { type: 'image/jpeg' })
    await userEvent.upload(input, photo)

    const preview = await screen.findByRole('img', {
      name: 'Fotografía cargada para el probador',
    })
    const photoSrc = preview.getAttribute('src')
    const cameraCalls = vi.mocked(requestCameraAccess).mock.calls.length
    vi.mocked(drawLens).mockClear()

    await userEvent.setup().click(screen.getByRole('button', { name: '1432, Boss' }))

    await waitFor(() => {
      const lens = vi.mocked(drawLens).mock.calls.at(-1)?.[1] as { src?: string } | undefined
      expect(lens?.src).toContain('BOSS14322M2.webp')
    })
    expect(preview).toHaveAttribute('src', photoSrc)
    expect(detectFace).toHaveBeenCalledTimes(1)
    expect(requestCameraAccess).toHaveBeenCalledTimes(cameraCalls)
  })
})

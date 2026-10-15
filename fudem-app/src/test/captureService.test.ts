import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CAPTURE_FAILED_MESSAGE,
  captureFilename,
  captureResult,
  downloadCapture,
  drawCaptureFrame,
} from '../lib/tryOn/captureService'
import { drawLens } from '../lib/tryOn/lensTransform'

vi.mock('../lib/tryOn/lensTransform', async () => {
  const actual = await vi.importActual<typeof import('../lib/tryOn/lensTransform')>(
    '../lib/tryOn/lensTransform',
  )
  return {
    ...actual,
    drawLens: vi.fn(actual.drawLens),
  }
})

function stubContext() {
  const drawImage = vi.fn()
  const ctx = {
    clearRect: vi.fn(),
    drawImage,
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
  } as unknown as CanvasRenderingContext2D
  return { ctx, drawImage }
}

describe('captureFilename', () => {
  it('normaliza el nombre del modelo para el PNG', () => {
    expect(captureFilename('AN7225')).toBe('probador-an7225.png')
    expect(captureFilename('  Boss 1432 / M2  ')).toBe('probador-boss-1432-m2.png')
    expect(captureFilename('Chloé')).toBe('probador-chloe.png')
    expect(captureFilename('***')).toBe('probador-lentes.png')
  })
})

describe('captureResult', () => {
  it('exporta PNG sin iniciar una descarga', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 20
    canvas.height = 10
    canvas.getContext = () => ({}) as CanvasRenderingContext2D
    canvas.toBlob = (callback, type) => {
      expect(type).toBe('image/png')
      callback(new Blob(['png-bytes'], { type: 'image/png' }))
    }
    const createObjectURL = vi.spyOn(URL, 'createObjectURL')

    const blob = await captureResult(canvas)

    expect(blob.type).toBe('image/png')
    expect(blob.size).toBeGreaterThan(0)
    expect(createObjectURL).not.toHaveBeenCalled()
    createObjectURL.mockRestore()
  })

  it('rechaza un canvas vacío o no disponible', async () => {
    await expect(captureResult(null)).rejects.toThrow(CAPTURE_FAILED_MESSAGE)
    const empty = document.createElement('canvas')
    empty.width = 0
    empty.height = 0
    await expect(captureResult(empty)).rejects.toThrow(CAPTURE_FAILED_MESSAGE)
  })

  it('rechaza si toBlob no genera un archivo', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 8
    canvas.height = 8
    canvas.getContext = () => ({}) as CanvasRenderingContext2D
    canvas.toBlob = (callback) => {
      callback(null)
    }
    await expect(captureResult(canvas)).rejects.toThrow(CAPTURE_FAILED_MESSAGE)
  })
})

describe('drawCaptureFrame', () => {
  it('dibuja el fondo y el lente en un solo canvas', () => {
    const { ctx, drawImage } = stubContext()
    const canvas = document.createElement('canvas')
    canvas.getContext = () => ctx

    const video = document.createElement('video')
    Object.defineProperty(video, 'videoWidth', { value: 640 })
    Object.defineProperty(video, 'videoHeight', { value: 480 })

    const lens = document.createElement('canvas')
    lens.width = 40
    lens.height = 20

    drawCaptureFrame(canvas, video, {
      image: lens,
      anchor: { x: 0, y: 0, width: 40, height: 20 },
      face: { leftEye: { x: 200, y: 120 }, rightEye: { x: 280, y: 120 }, yaw: 0 },
    })

    expect(canvas.width).toBe(640)
    expect(canvas.height).toBe(480)
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 640, 480)
    expect(drawLens).toHaveBeenCalled()
  })
})

describe('downloadCapture', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('descarga el blob y libera el object URL', () => {
    const blob = new Blob(['png'], { type: 'image/png' })
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:capture')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    let downloaded = ''
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloaded = this.download
    })

    downloadCapture(blob, 'probador-an7225.png')

    expect(click).toHaveBeenCalledTimes(1)
    expect(downloaded).toBe('probador-an7225.png')
    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:capture')
    expect(document.querySelector('a')).toBeNull()
    createObjectURL.mockRestore()
    revokeObjectURL.mockRestore()
  })
})

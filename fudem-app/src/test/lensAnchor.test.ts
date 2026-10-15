import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  boundingBoxFromAlpha,
  clearLensAnchorCache,
  getLensAnchor,
} from '../lib/tryOn/lensAnchor'

function opaqueRect(
  width: number,
  height: number,
  x: number,
  y: number,
  boxWidth: number,
  boxHeight: number,
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let row = y; row < y + boxHeight; row += 1) {
    for (let col = x; col < x + boxWidth; col += 1) {
      const index = (row * width + col) * 4
      pixels[index] = 10
      pixels[index + 1] = 20
      pixels[index + 2] = 30
      pixels[index + 3] = 200
    }
  }
  return pixels
}

function fakeImage(src: string, width: number, height: number, complete = true) {
  return {
    src,
    currentSrc: src,
    complete,
    naturalWidth: width,
    naturalHeight: height,
    width,
    height,
  } as HTMLImageElement
}

function mockCanvasPixels(pixels: Uint8ClampedArray) {
  const getImageData = vi.fn((sx: number, sy: number, width: number, height: number) => ({
    data: pixels,
    width,
    height,
  }))
  const drawImage = vi.fn()
  const originalCreate = document.createElement.bind(document)

  vi.spyOn(document, 'createElement').mockImplementation(((
    tagName: string,
    options?: ElementCreationOptions,
  ) => {
    if (tagName.toLowerCase() === 'canvas') {
      const canvas = originalCreate('canvas')
      canvas.getContext = (() =>
        ({
          clearRect: vi.fn(),
          drawImage,
          getImageData,
        }) as unknown as CanvasRenderingContext2D) as typeof canvas.getContext
      return canvas
    }
    return originalCreate(tagName, options)
  }) as typeof document.createElement)

  return { getImageData, drawImage }
}

describe('boundingBoxFromAlpha', () => {
  it('calcula el recuadro de píxeles visibles en 300×300', () => {
    const pixels = opaqueRect(300, 300, 40, 80, 220, 60)
    expect(boundingBoxFromAlpha(pixels, 300, 300)).toEqual({
      x: 40,
      y: 80,
      width: 220,
      height: 60,
    })
  })

  it('calcula el recuadro según el tamaño real en 1500×1500', () => {
    const pixels = opaqueRect(1500, 1500, 120, 500, 1260, 180)
    expect(boundingBoxFromAlpha(pixels, 1500, 1500)).toEqual({
      x: 120,
      y: 500,
      width: 1260,
      height: 180,
    })
  })

  it('ignora el fondo transparente', () => {
    const pixels = opaqueRect(10, 10, 2, 3, 1, 1)
    expect(boundingBoxFromAlpha(pixels, 10, 10)).toEqual({
      x: 2,
      y: 3,
      width: 1,
      height: 1,
    })
  })

  it('devuelve un recuadro vacío si no hay píxeles visibles', () => {
    expect(boundingBoxFromAlpha(new Uint8ClampedArray(4 * 4 * 4), 4, 4)).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    })
  })
})

describe('getLensAnchor', () => {
  afterEach(() => {
    clearLensAnchorCache()
    vi.restoreAllMocks()
  })

  it('lee el canal alpha desde un canvas del tamaño real de la imagen', () => {
    const pixels = opaqueRect(300, 300, 10, 20, 50, 40)
    const { getImageData, drawImage } = mockCanvasPixels(pixels)
    const image = fakeImage('/catalog/ARNETTEAN7225.webp', 300, 300)

    expect(getLensAnchor(image)).toEqual({ x: 10, y: 20, width: 50, height: 40 })
    expect(drawImage).toHaveBeenCalled()
    expect(getImageData).toHaveBeenCalledWith(0, 0, 300, 300)
  })

  it('usa 1500×1500 cuando la imagen es de esa resolución', () => {
    const pixels = opaqueRect(1500, 1500, 200, 300, 900, 100)
    const { getImageData } = mockCanvasPixels(pixels)
    const image = fakeImage('/catalog/CHLOGAN93052.webp', 1500, 1500)

    expect(getLensAnchor(image)).toEqual({ x: 200, y: 300, width: 900, height: 100 })
    expect(getImageData).toHaveBeenCalledWith(0, 0, 1500, 1500)
  })

  it('devuelve el resultado cacheado por URL sin volver a escanear', () => {
    const pixels = opaqueRect(300, 300, 5, 5, 10, 10)
    const { getImageData } = mockCanvasPixels(pixels)
    const image = fakeImage('/catalog/BOSS14322M2.webp', 300, 300)

    const first = getLensAnchor(image)
    const second = getLensAnchor(image)

    expect(second).toEqual(first)
    expect(getImageData).toHaveBeenCalledTimes(1)
  })

  it('no cachea una imagen que aún no terminó de cargar', () => {
    mockCanvasPixels(opaqueRect(8, 8, 0, 0, 8, 8))
    const loading = fakeImage('/catalog/AIRFORCEAFV116.webp', 8, 8, false)
    expect(getLensAnchor(loading)).toEqual({ x: 0, y: 0, width: 0, height: 0 })

    vi.restoreAllMocks()
    const pixels = opaqueRect(300, 300, 1, 2, 3, 4)
    mockCanvasPixels(pixels)
    const loaded = fakeImage('/catalog/AIRFORCEAFV116.webp', 300, 300, true)
    expect(getLensAnchor(loaded)).toEqual({ x: 1, y: 2, width: 3, height: 4 })
  })

  it('devuelve recuadro vacío si falla la lectura del canvas', () => {
    const originalCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName.toLowerCase() === 'canvas') {
        const canvas = originalCreate('canvas')
        canvas.getContext = (() => null) as typeof canvas.getContext
        return canvas
      }
      return originalCreate(tagName)
    }) as typeof document.createElement)

    const image = fakeImage('/catalog/broken.webp', 300, 300)
    expect(getLensAnchor(image)).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })
})

import { describe, expect, it, vi } from 'vitest'
import {
  LENS_WIDTH_OVER_IPD,
  computeLensTransform,
  drawLens,
} from '../lib/tryOn/lensTransform'
import type { FaceData, LensAnchor } from '../lib/tryOn/types'

const face: FaceData = {
  leftEye: { x: 100, y: 80 },
  rightEye: { x: 180, y: 80 },
}

const anchor: LensAnchor = { x: 10, y: 20, width: 40, height: 20 }

describe('computeLensTransform', () => {
  it('coloca el lente entre los ojos, más ancho que la distancia interpupilar y sin rotación', () => {
    const transform = computeLensTransform(face, anchor)

    expect(transform.x).toBe(140)
    expect(transform.y).toBe(80)
    expect(transform.width).toBe(80 * LENS_WIDTH_OVER_IPD)
    expect(transform.rotation).toBeCloseTo(0)
  })

  it('rota según el ángulo entre los ojos', () => {
    const tilted: FaceData = {
      leftEye: { x: 0, y: 0 },
      rightEye: { x: 10, y: 10 },
    }

    const transform = computeLensTransform(tilted, anchor)

    expect(transform.rotation).toBeCloseTo(Math.PI / 4)
    expect(transform.width).toBeCloseTo(Math.hypot(10, 10) * LENS_WIDTH_OVER_IPD)
    expect(transform.x).toBe(5)
    expect(transform.y).toBe(5)
  })

  it('aplica el ajuste manual y usa valores por defecto si falta alguna parte', () => {
    const adjusted = computeLensTransform(face, anchor, {
      dx: 4,
      dy: -8,
      scale: 1.5,
      rotation: 90,
    })

    expect(adjusted.x).toBe(144)
    expect(adjusted.y).toBe(72)
    expect(adjusted.width).toBe(120 * LENS_WIDTH_OVER_IPD)
    expect(adjusted.rotation).toBeCloseTo(Math.PI / 2)

    const partial = computeLensTransform(face, anchor, { dx: 6 })
    expect(partial.x).toBe(146)
    expect(partial.y).toBe(80)
    expect(partial.width).toBe(80 * LENS_WIDTH_OVER_IPD)
    expect(partial.rotation).toBeCloseTo(0)
  })

  it('no asigna ancho si el ancla del lente no es válida', () => {
    const transform = computeLensTransform(face, { x: 0, y: 0, width: 0, height: 10 })
    expect(transform.width).toBe(0)
    expect(transform.x).toBe(140)
  })
})

describe('drawLens', () => {
  it('alinea el centro del ancla con los ojos y dibuja la imagen completa', () => {
    const image = document.createElement('canvas')
    image.width = 200
    image.height = 100
    const transform = computeLensTransform(face, anchor)
    const drawImage = vi.fn()
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      drawImage,
    } as unknown as CanvasRenderingContext2D

    drawLens(ctx, image, anchor, transform)

    expect(ctx.translate).toHaveBeenCalledWith(140, 80)
    expect(ctx.rotate).toHaveBeenCalledWith(expect.closeTo(0))
    const drawScale = (80 * LENS_WIDTH_OVER_IPD) / 40
    // centro del ancla = (30, 30); el de la imagen (100, 50) no es el punto de alineación
    expect(drawImage).toHaveBeenCalledWith(
      image,
      -30 * drawScale,
      -30 * drawScale,
      200 * drawScale,
      100 * drawScale,
    )
  })

  it('no dibuja si no hay un lente que colocar', () => {
    const image = document.createElement('canvas')
    image.width = 20
    image.height = 20
    const drawImage = vi.fn()
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      drawImage,
    } as unknown as CanvasRenderingContext2D

    drawLens(ctx, image, anchor, { x: 0, y: 0, width: 0, rotation: 0 })

    expect(drawImage).not.toHaveBeenCalled()
  })
})

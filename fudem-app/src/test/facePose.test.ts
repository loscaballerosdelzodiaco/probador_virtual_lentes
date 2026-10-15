import { describe, expect, it } from 'vitest'
import { isFaceFrontal, MAX_FACE_YAW } from '../lib/tryOn/facePose'

describe('isFaceFrontal', () => {
  it('acepta una cara de frente y rechaza un giro fuerte', () => {
    expect(
      isFaceFrontal({ leftEye: { x: 0, y: 0 }, rightEye: { x: 10, y: 0 }, yaw: 0 }),
    ).toBe(true)
    expect(
      isFaceFrontal({ leftEye: { x: 0, y: 0 }, rightEye: { x: 10, y: 0 } }),
    ).toBe(true)
    expect(
      isFaceFrontal({
        leftEye: { x: 0, y: 0 },
        rightEye: { x: 10, y: 0 },
        yaw: MAX_FACE_YAW + 0.01,
      }),
    ).toBe(false)
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestCameraAccess, stopCamera } from '../lib/tryOn/cameraService'

function fakeStream() {
  const track = { stop: vi.fn() }
  return {
    stream: { getTracks: () => [track] } as unknown as MediaStream,
    track,
  }
}

describe('cameraService', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('devuelve el MediaStream cuando el usuario concede la cámara', async () => {
    const { stream } = fakeStream()
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
    })

    await expect(requestCameraAccess()).resolves.toEqual({ ok: true, stream })
  })

  it('marca denied si el permiso se rechaza', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError')),
      },
    })

    await expect(requestCameraAccess()).resolves.toEqual({
      ok: false,
      reason: 'denied',
    })
  })

  it('marca unavailable si no hay getUserMedia o falla el dispositivo', async () => {
    vi.stubGlobal('navigator', {})
    await expect(requestCameraAccess()).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    })

    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(new DOMException('missing', 'NotFoundError')),
      },
    })
    await expect(requestCameraAccess()).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    })
  })

  it('detiene todas las pistas al cerrar la cámara', () => {
    const { stream, track } = fakeStream()
    stopCamera(stream)
    expect(track.stop).toHaveBeenCalledTimes(1)
    expect(() => stopCamera(null)).not.toThrow()
  })
})

import { describe, expect, it } from 'vitest'
import {
  getTryOnStatus,
  type TryOnStatusInput,
} from '../lib/tryOn/status'

const face = { leftEye: { x: 40, y: 50 }, rightEye: { x: 80, y: 50 } }

const base: TryOnStatusInput = {
  mode: 'camera',
  cameraReady: true,
  photoLoading: false,
  hasPhoto: false,
  cameraFace: face,
  errorKey: null,
}

describe('getTryOnStatus', () => {
  it('cámara activa con rostro', () => {
    expect(getTryOnStatus(base)).toBe('camera')
  })

  it('cámara activa antes de la primera detección', () => {
    expect(getTryOnStatus({ ...base, cameraFace: undefined })).toBe('camera')
  })

  it('cargando mientras se inicia la cámara', () => {
    expect(getTryOnStatus({ ...base, cameraReady: false, cameraFace: undefined })).toBe('loading')
  })

  it('cargando mientras se procesa una foto', () => {
    expect(getTryOnStatus({ ...base, photoLoading: true })).toBe('loading')
    expect(getTryOnStatus({ ...base, mode: 'photo', photoLoading: true })).toBe('loading')
  })

  it('rostro no detectado con la cámara activa', () => {
    expect(getTryOnStatus({ ...base, cameraFace: null })).toBe('faceNotDetected')
  })

  it('foto cargada', () => {
    expect(getTryOnStatus({ ...base, mode: 'photo', hasPhoto: true })).toBe('photo')
  })

  it('modo foto sin foto todavía', () => {
    expect(getTryOnStatus({ ...base, mode: 'photo' })).toBe('idle')
  })

  it('el error tiene prioridad sobre cualquier otro estado', () => {
    expect(getTryOnStatus({ ...base, errorKey: 'cameraUnavailable' })).toBe('error')
    expect(getTryOnStatus({ ...base, cameraFace: null, errorKey: 'invalidImage' })).toBe('error')
    expect(
      getTryOnStatus({ ...base, photoLoading: true, cameraReady: false, errorKey: 'unsupportedFormat' }),
    ).toBe('error')
  })
})

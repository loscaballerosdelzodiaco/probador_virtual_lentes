import { describe, expect, it } from 'vitest'
import {
  DOCUMENTO_CALIDAD_BORROSA_MESSAGE,
  DOCUMENTO_CALIDAD_CONTRASTE_MESSAGE,
  DOCUMENTO_CALIDAD_INSUFICIENTE,
  DOCUMENTO_CALIDAD_OSCURA_MESSAGE,
  evaluarCalidadArchivo,
  imagenSintetica,
  medirCalidadPixels,
  resultadoDesdeMetricas,
} from '../lib/documentoCalidad'

describe('calidad de receta', () => {
  it('marca oscura, poco contraste o borrosa y deja pasar una imagen nítida', () => {
    const oscura = medirCalidadPixels(imagenSintetica(64, 64, 'oscura'), 64, 64)
    expect(resultadoDesdeMetricas(oscura)).toMatchObject({
      ok: false,
      estado: DOCUMENTO_CALIDAD_INSUFICIENTE,
      motivo: 'oscura',
      error: DOCUMENTO_CALIDAD_OSCURA_MESSAGE,
    })

    const plana = medirCalidadPixels(imagenSintetica(64, 64, 'plana'), 64, 64)
    expect(resultadoDesdeMetricas(plana)).toMatchObject({
      ok: false,
      estado: DOCUMENTO_CALIDAD_INSUFICIENTE,
      motivo: 'bajo_contraste',
      error: DOCUMENTO_CALIDAD_CONTRASTE_MESSAGE,
    })

    const borrosa = resultadoDesdeMetricas({
      brillo: 120,
      contraste: 40,
      nitidez: 2,
    })
    expect(borrosa).toMatchObject({
      ok: false,
      motivo: 'borrosa',
      error: DOCUMENTO_CALIDAD_BORROSA_MESSAGE,
    })

    const nitida = medirCalidadPixels(imagenSintetica(64, 64, 'nitida'), 64, 64)
    expect(resultadoDesdeMetricas(nitida)).toEqual({ ok: true })
  })

  it('no evalúa nitidez en un PDF; el formato ya se validó aparte', async () => {
    const pdf = new File(['%PDF-1.4 extra'], 'receta.pdf', { type: 'application/pdf' })
    await expect(evaluarCalidadArchivo(pdf)).resolves.toEqual({ ok: true })
  })
})

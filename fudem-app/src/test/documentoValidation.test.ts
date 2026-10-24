import { describe, expect, it } from 'vitest'
import {
  DOCUMENTO_CORRUPT_ERROR_MESSAGE,
  DOCUMENTO_EMPTY_ERROR_MESSAGE,
  DOCUMENTO_EXTENSION_ERROR_MESSAGE,
  DOCUMENTO_MISMATCH_ERROR_MESSAGE,
  DOCUMENTO_SIZE_ERROR_MESSAGE,
  MAX_DOCUMENTO_BYTES,
  detectarTipoPorContenido,
  parseMaxDocumentoBytes,
  validarArchivoDocumento,
  validarDocumentoBytes,
} from '../lib/documentoValidation'

function jpegBytes() {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
}

function pngBytes() {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
    0x48, 0x44, 0x52,
  ])
}

function pdfBytes() {
  return new TextEncoder().encode('%PDF-1.4')
}

describe('validación de documentos', () => {
  it('lee el límite de tamaño configurable', () => {
    expect(parseMaxDocumentoBytes(undefined)).toBe(10 * 1024 * 1024)
    expect(parseMaxDocumentoBytes('2048')).toBe(2048)
    expect(parseMaxDocumentoBytes('no-numero')).toBe(10 * 1024 * 1024)
    expect(MAX_DOCUMENTO_BYTES).toBe(10 * 1024 * 1024)
  })

  it('detecta el tipo por el contenido, no por el MIME del navegador', () => {
    expect(detectarTipoPorContenido(pdfBytes())).toBe('pdf')
    expect(detectarTipoPorContenido(jpegBytes())).toBe('jpeg')
    expect(detectarTipoPorContenido(pngBytes())).toBe('png')
    expect(
      detectarTipoPorContenido(
        new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      ),
    ).toBe('webp')
    expect(detectarTipoPorContenido(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull()
  })

  it('rechaza vacío, grande, extensión, corrupto o con extensión distinta al contenido', () => {
    expect(
      validarDocumentoBytes({ bytes: new Uint8Array(), fileName: 'receta.pdf' }),
    ).toMatchObject({ ok: false, code: 'empty', error: DOCUMENTO_EMPTY_ERROR_MESSAGE })

    expect(
      validarDocumentoBytes({
        bytes: pdfBytes(),
        fileName: 'receta.pdf',
        maxBytes: 4,
      }),
    ).toMatchObject({ ok: false, code: 'size' })

    expect(
      validarDocumentoBytes({ bytes: pdfBytes(), fileName: 'receta.gif' }),
    ).toMatchObject({
      ok: false,
      code: 'extension',
      error: DOCUMENTO_EXTENSION_ERROR_MESSAGE,
    })

    expect(
      validarDocumentoBytes({
        bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        fileName: 'foto.png',
      }),
    ).toMatchObject({
      ok: false,
      code: 'corrupt',
      error: DOCUMENTO_CORRUPT_ERROR_MESSAGE,
    })

    expect(
      validarDocumentoBytes({ bytes: jpegBytes(), fileName: 'receta.pdf' }),
    ).toMatchObject({
      ok: false,
      code: 'mismatch',
      error: DOCUMENTO_MISMATCH_ERROR_MESSAGE,
    })

    expect(validarDocumentoBytes({ bytes: pdfBytes(), fileName: 'receta.pdf' })).toMatchObject({
      ok: true,
      mime: 'application/pdf',
      extension: 'pdf',
    })
  })

  it('ignora el MIME declarado por el navegador al validar un File', async () => {
    const spoofed = new File([pdfBytes()], 'receta.pdf', { type: 'image/gif' })
    await expect(validarArchivoDocumento(spoofed)).resolves.toBeNull()

    const empty = new File([], 'receta.pdf', { type: 'application/pdf' })
    await expect(validarArchivoDocumento(empty)).resolves.toBe(DOCUMENTO_EMPTY_ERROR_MESSAGE)

    const tooBig = new File([jpegBytes()], 'grande.jpg', { type: 'text/plain' })
    Object.defineProperty(tooBig, 'size', { value: MAX_DOCUMENTO_BYTES + 1 })
    await expect(validarArchivoDocumento(tooBig)).resolves.toBe(DOCUMENTO_SIZE_ERROR_MESSAGE)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../lib/supabase'
import {
  DOCUMENTO_ACCESS_ERROR_MESSAGE,
  DOCUMENTO_FORMAT_ERROR_MESSAGE,
  DOCUMENTO_SIZE_ERROR_MESSAGE,
  DOCUMENTO_STORAGE_ERROR_MESSAGE,
  MAX_DOCUMENTO_BYTES,
  buildUbicacionArchivo,
  downloadDocumentoFile,
  messageFromStorageError,
  sanitizeNombreArchivo,
  ubicacionPerteneceAlUsuario,
  uploadDocumentoFile,
  validateDocumentoFile,
} from '../lib/documentoStorage'

vi.mock('../lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(),
    },
    auth: {
      getUser: vi.fn(),
    },
  },
}))

function pdfFile(name = 'receta.pdf') {
  return new File(['%PDF-1.4'], name, { type: 'application/pdf' })
}

describe('documentoStorage', () => {
  beforeEach(() => {
    vi.mocked(supabase.storage.from).mockReset()
  })

  it('acepta PDF e imagen y rechaza otros formatos o un archivo demasiado grande', () => {
    expect(validateDocumentoFile(pdfFile())).toBeNull()
    expect(
      validateDocumentoFile(new File(['x'], 'foto.png', { type: 'image/png' })),
    ).toBeNull()
    expect(
      validateDocumentoFile(new File(['x'], 'nota.txt', { type: 'text/plain' })),
    ).toBe(DOCUMENTO_FORMAT_ERROR_MESSAGE)
    const tooBig = new File(['x'], 'grande.pdf', { type: 'application/pdf' })
    Object.defineProperty(tooBig, 'size', { value: MAX_DOCUMENTO_BYTES + 1 })
    expect(validateDocumentoFile(tooBig)).toBe(DOCUMENTO_SIZE_ERROR_MESSAGE)
  })

  it('arma una ruta privada bajo el id del usuario y limpia el nombre', () => {
    const path = buildUbicacionArchivo(
      '11111111-1111-1111-1111-111111111111',
      'receta',
      pdfFile(),
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    )
    expect(path).toBe(
      '11111111-1111-1111-1111-111111111111/receta/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.pdf',
    )
    expect(sanitizeNombreArchivo('C:\\\\tmp\\\\mi receta.pdf')).toBe('mi receta.pdf')
    expect(
      ubicacionPerteneceAlUsuario(
        '11111111-1111-1111-1111-111111111111',
        path,
      ),
    ).toBe(true)
    expect(
      ubicacionPerteneceAlUsuario('otro-id', path),
    ).toBe(false)
  })

  it('sube al bucket privado sin upsert y sin URL pública', async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: 'a' }, error: null })
    vi.mocked(supabase.storage.from).mockReturnValue({ upload } as never)

    await uploadDocumentoFile('user/receta/id.pdf', pdfFile())

    expect(supabase.storage.from).toHaveBeenCalledWith('documentos')
    expect(upload).toHaveBeenCalledWith(
      'user/receta/id.pdf',
      expect.any(File),
      {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf',
      },
    )
    expect(upload.mock.calls[0][2]).not.toHaveProperty('public')
  })

  it('explica el fallo de almacenamiento sin el detalle técnico', async () => {
    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'new row violates row-level security', statusCode: '403' },
      }),
    } as never)

    await expect(uploadDocumentoFile('user/receta/id.pdf', pdfFile())).rejects.toThrow(
      DOCUMENTO_ACCESS_ERROR_MESSAGE,
    )
    expect(messageFromStorageError({ message: 'Internal', statusCode: 500 })).toBe(
      DOCUMENTO_STORAGE_ERROR_MESSAGE,
    )
  })

  it('descarga el blob autenticado y no pide un enlace público', async () => {
    const blob = new Blob(['pdf'])
    const download = vi.fn().mockResolvedValue({ data: blob, error: null })
    vi.mocked(supabase.storage.from).mockReturnValue({ download } as never)

    await expect(downloadDocumentoFile('user/receta/id.pdf')).resolves.toBe(blob)
    expect(download).toHaveBeenCalledWith('user/receta/id.pdf')
  })
})

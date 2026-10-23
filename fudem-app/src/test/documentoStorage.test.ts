import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../lib/supabase'
import {
  DOCUMENTO_ACCESS_ERROR_MESSAGE,
  DOCUMENTO_CORRUPT_ERROR_MESSAGE,
  DOCUMENTO_EXTENSION_ERROR_MESSAGE,
  DOCUMENTO_SIZE_ERROR_MESSAGE,
  DOCUMENTO_STORAGE_ERROR_MESSAGE,
  MAX_DOCUMENTO_BYTES,
  buildUbicacionArchivo,
  downloadDocumentoFile,
  messageFromStorageError,
  sanitizeNombreArchivo,
  ubicacionPerteneceAlUsuario,
  uploadDocumentoFile,
  validarArchivoDocumento,
  validarDocumentoEnServidor,
} from '../lib/documentoStorage'

vi.mock('../lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
    auth: {
      getUser: vi.fn(),
    },
  },
}))

function pdfFile(name = 'receta.pdf') {
  return new File(['%PDF-1.4'], name, { type: 'application/octet-stream' })
}

function jpegFile(name = 'foto.jpg') {
  return new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], name, {
    type: 'application/octet-stream',
  })
}

describe('documentoStorage', () => {
  beforeEach(() => {
    vi.mocked(supabase.storage.from).mockReset()
    vi.mocked(supabase.functions.invoke).mockReset()
  })

  it('acepta PDF e imagen por contenido y rechaza extensión o tamaño inválidos', async () => {
    await expect(validarArchivoDocumento(pdfFile())).resolves.toBeNull()
    await expect(validarArchivoDocumento(jpegFile())).resolves.toBeNull()
    await expect(
      validarArchivoDocumento(new File(['x'], 'nota.txt', { type: 'application/pdf' })),
    ).resolves.toBe(DOCUMENTO_EXTENSION_ERROR_MESSAGE)
    const tooBig = pdfFile('grande.pdf')
    Object.defineProperty(tooBig, 'size', { value: MAX_DOCUMENTO_BYTES + 1 })
    await expect(validarArchivoDocumento(tooBig)).resolves.toBe(DOCUMENTO_SIZE_ERROR_MESSAGE)
  })

  it('rechaza una imagen cuyo contenido está corrupto', async () => {
    await expect(
      validarArchivoDocumento(new File(['no es png'], 'foto.png', { type: 'image/png' })),
    ).resolves.toBe(DOCUMENTO_CORRUPT_ERROR_MESSAGE)
  })

  it('arma una ruta privada bajo el id del usuario y limpia el nombre', () => {
    const path = buildUbicacionArchivo(
      '11111111-1111-1111-1111-111111111111',
      'receta',
      pdfFile(),
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'pdf',
    )
    expect(path).toBe(
      '11111111-1111-1111-1111-111111111111/receta/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.pdf',
    )
    expect(sanitizeNombreArchivo('C:\\\\tmp\\\\mi receta.pdf')).toBe('mi receta.pdf')
    expect(
      ubicacionPerteneceAlUsuario('11111111-1111-1111-1111-111111111111', path),
    ).toBe(true)
    expect(ubicacionPerteneceAlUsuario('otro-id', path)).toBe(false)
  })

  it('pide al servidor que inspeccione los bytes reales', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { ok: true, mime: 'application/pdf', extension: 'pdf' },
      error: null,
    } as never)

    await expect(validarDocumentoEnServidor(pdfFile())).resolves.toEqual({
      mime: 'application/pdf',
      extension: 'pdf',
    })
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'validar-documento',
      expect.objectContaining({ body: expect.any(FormData) }),
    )
  })

  it('usa el mensaje claro si el servidor rechaza el contenido', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { error: DOCUMENTO_CORRUPT_ERROR_MESSAGE, code: 'corrupt' },
      error: { message: 'non-2xx' },
    } as never)

    await expect(validarDocumentoEnServidor(pdfFile())).rejects.toThrow(
      DOCUMENTO_CORRUPT_ERROR_MESSAGE,
    )
  })

  it('sube al bucket privado sin upsert y sin URL pública', async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: 'a' }, error: null })
    vi.mocked(supabase.storage.from).mockReturnValue({ upload } as never)

    await uploadDocumentoFile('user/receta/id.pdf', pdfFile(), 'application/pdf')

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

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../lib/supabase'
import {
  CalidadInsuficienteError,
  DOCUMENTO_CALIDAD_BORROSA_MESSAGE,
  DOCUMENTO_CALIDAD_INSUFICIENTE,
  evaluarCalidadArchivo,
} from '../lib/documentoCalidad'
import { DocumentoCargaError } from '../lib/documentoErrores'
import {
  DOCUMENTO_ACCESS_ERROR_MESSAGE,
  DOCUMENTO_FORMAT_ERROR_MESSAGE,
} from '../lib/documentoStorage'
import {
  DOCUMENTO_ELIMINAR_ERROR_MESSAGE,
  DOCUMENTO_EN_USO_ERROR_MESSAGE,
  DOCUMENTO_REGISTRO_ERROR_MESSAGE,
  DOCUMENTOS_LOAD_ERROR_MESSAGE,
  buildDocumentoInsert,
  descargarDocumento,
  eliminarDocumento,
  guardarDocumento,
  listarDocumentos,
  listarValidacion,
  obtenerRecetaAceptada,
  recetaAceptadaDe,
  registrarDocumento,
} from '../services/documentoService'

vi.mock('../lib/documentoCalidad', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/documentoCalidad')>()
  return {
    ...actual,
    evaluarCalidadArchivo: vi.fn(actual.evaluarCalidadArchivo),
  }
})

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
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

const usuarioId = '11111111-1111-1111-1111-111111111111'

const documento = {
  id: 1,
  usuario_id: usuarioId,
  nombre_archivo: 'receta.pdf',
  tipo: 'receta' as const,
  fecha_carga: '2026-10-21T18:00:00.000Z',
  ubicacion_archivo: `${usuarioId}/receta.pdf`,
  estado_recepcion: 'recibida' as const,
}

function mockSesion() {
  vi.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user: { id: usuarioId } },
    error: null,
  } as never)
}

function mockDocumentosYPedidos(
  documentos: { data: unknown; error: unknown },
  pedidos: { data: unknown; error: unknown } = { data: [], error: null },
) {
  const order = vi.fn().mockReturnValue({
    returns: vi.fn().mockResolvedValue(documentos),
  })
  vi.mocked(supabase.from).mockImplementation((table) => {
    if (table === 'pedido') {
      return {
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            returns: vi.fn().mockResolvedValue(pedidos),
          }),
        }),
      } as never
    }
    return {
      select: vi.fn().mockReturnValue({ order }),
    } as never
  })
  return { order }
}

describe('documentoService', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
    vi.mocked(supabase.storage.from).mockReset()
    vi.mocked(supabase.functions.invoke).mockReset()
    vi.mocked(supabase.auth.getUser).mockReset()
    vi.mocked(evaluarCalidadArchivo).mockReset()
    vi.mocked(evaluarCalidadArchivo).mockResolvedValue({ ok: true })
  })

  it('arma el insert como recibida y sin un usuario_id del cliente', () => {
    expect(
      buildDocumentoInsert({
        nombre_archivo: ' receta.pdf ',
        tipo: 'examen',
        ubicacion_archivo: ` ${usuarioId}/examen.webp `,
      }),
    ).toEqual({
      nombre_archivo: 'receta.pdf',
      tipo: 'examen',
      ubicacion_archivo: `${usuarioId}/examen.webp`,
      estado_recepcion: 'recibida',
    })
    expect(buildDocumentoInsert({
      nombre_archivo: 'receta.pdf',
      tipo: 'receta',
      ubicacion_archivo: `${usuarioId}/receta.pdf`,
    })).not.toHaveProperty('usuario_id')
  })

  it('lista documentos de la sesión, sin un id enviado por el cliente', async () => {
    mockSesion()
    const order = vi.fn().mockReturnValue({
      returns: vi.fn().mockResolvedValue({ data: [documento], error: null }),
    })
    const select = vi.fn().mockReturnValue({ order })
    vi.mocked(supabase.from).mockReturnValue({ select } as never)

    await expect(listarDocumentos()).resolves.toEqual([documento])
    expect(supabase.auth.getUser).toHaveBeenCalled()
    expect(supabase.from).toHaveBeenCalledWith('documento')
    expect(order).toHaveBeenCalledWith('fecha_carga', { ascending: false })
  })

  it('toma solo la receta recibida del cliente, no pendientes ni exámenes', async () => {
    mockSesion()
    const examen = {
      ...documento,
      id: 2,
      tipo: 'examen' as const,
      nombre_archivo: 'examen.pdf',
    }
    const pendiente = {
      ...documento,
      id: 3,
      estado_recepcion: 'pendiente' as const,
      nombre_archivo: 'borrador.jpg',
    }
    mockDocumentosYPedidos({
      data: [pendiente, documento, examen],
      error: null,
    })

    expect(recetaAceptadaDe([pendiente, examen])).toBeNull()
    await expect(obtenerRecetaAceptada()).resolves.toEqual(documento)
  })

  it('no reutiliza una receta que ya está en un pedido', async () => {
    mockSesion()
    const recetaNueva = {
      ...documento,
      id: 8,
      nombre_archivo: 'receta-nueva.pdf',
    }
    mockDocumentosYPedidos(
      { data: [documento, recetaNueva], error: null },
      { data: [{ documento_id: 1 }], error: null },
    )

    expect(recetaAceptadaDe([documento, recetaNueva], [1])).toEqual(recetaNueva)
    await expect(obtenerRecetaAceptada()).resolves.toEqual(recetaNueva)
  })

  it('pide otra receta si la recibida ya se usó en un pedido', async () => {
    mockSesion()
    mockDocumentosYPedidos(
      { data: [documento], error: null },
      { data: [{ documento_id: 1 }], error: null },
    )

    expect(recetaAceptadaDe([documento], [1])).toBeNull()
    await expect(obtenerRecetaAceptada()).resolves.toBeNull()
  })

  it('explica el fallo al cargar documentos sin el detalle técnico', async () => {
    mockSesion()
    const order = vi.fn().mockReturnValue({
      returns: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'permission denied for table documento' },
      }),
    })
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({ order }),
    } as never)

    await expect(listarDocumentos()).rejects.toThrow(DOCUMENTOS_LOAD_ERROR_MESSAGE)
  })

  it('inserta el documento recibido y devuelve la fila creada', async () => {
    const single = vi.fn().mockResolvedValue({ data: documento, error: null })
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        returns: vi.fn().mockReturnValue({ single }),
      }),
    })
    vi.mocked(supabase.from).mockReturnValue({ insert } as never)

    await expect(
      registrarDocumento({
        nombre_archivo: 'receta.pdf',
        tipo: 'receta',
        ubicacion_archivo: documento.ubicacion_archivo,
      }),
    ).resolves.toEqual(documento)
    expect(insert).toHaveBeenCalledWith({
      nombre_archivo: 'receta.pdf',
      tipo: 'receta',
      ubicacion_archivo: documento.ubicacion_archivo,
      estado_recepcion: 'recibida',
    })
  })

  it('explica el fallo al registrar el archivo', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          returns: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'new row violates row-level security' },
            }),
          }),
        }),
      }),
    } as never)

    await expect(
      registrarDocumento({
        nombre_archivo: 'receta.pdf',
        tipo: 'receta',
        ubicacion_archivo: documento.ubicacion_archivo,
      }),
    ).rejects.toThrow(DOCUMENTO_REGISTRO_ERROR_MESSAGE)
  })

  it('devuelve null cuando el documento todavía no tiene validación', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          returns: vi.fn().mockReturnValue({ maybeSingle }),
        }),
      }),
    } as never)

    await expect(listarValidacion(1)).resolves.toBeNull()
    expect(supabase.from).toHaveBeenCalledWith('validacion_documento')
  })

  it('marca recibida solo si el almacenamiento y el registro terminan; si el registro falla borra el objeto', async () => {
    mockSesion()
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { ok: true, mime: 'application/pdf', extension: 'pdf' },
      error: null,
    } as never)
    const upload = vi.fn().mockResolvedValue({ data: { path: 'x' }, error: null })
    const remove = vi.fn().mockResolvedValue({ data: [], error: null })
    vi.mocked(supabase.storage.from).mockReturnValue({ upload, remove } as never)
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        returns: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'insert failed' },
          }),
        }),
      }),
    })
    vi.mocked(supabase.from).mockReturnValue({ insert } as never)

    await expect(
      guardarDocumento(
        'receta',
        new File(['%PDF-1.4'], 'receta.pdf', { type: 'application/pdf' }),
      ),
    ).rejects.toThrow(DOCUMENTO_REGISTRO_ERROR_MESSAGE)
    expect(supabase.functions.invoke).toHaveBeenCalled()
    expect(upload).toHaveBeenCalled()
    expect(upload.mock.calls[0][2]).toEqual(
      expect.objectContaining({ contentType: 'application/pdf' }),
    )
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ estado_recepcion: 'recibida' }),
    )
    expect(remove).toHaveBeenCalled()
  })

  function mockDelete(result: { data: DocumentoCliente | null; error: unknown }) {
    const maybeSingle = vi.fn().mockResolvedValue(result)
    const eq = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        returns: vi.fn().mockReturnValue({ maybeSingle }),
      }),
    })
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({ eq }),
    } as never)
    return eq
  }

  it('elimina el registro y el archivo del cliente', async () => {
    mockSesion()
    const eq = mockDelete({ data: documento, error: null })
    const remove = vi.fn().mockResolvedValue({ data: [], error: null })
    vi.mocked(supabase.storage.from).mockReturnValue({ remove } as never)

    await expect(eliminarDocumento(documento)).resolves.toBeUndefined()
    expect(eq).toHaveBeenCalledWith('id', documento.id)
    expect(remove).toHaveBeenCalledWith([documento.ubicacion_archivo])
  })

  it('no da por eliminado un archivo si la base no borró la fila', async () => {
    mockSesion()
    mockDelete({ data: null, error: null })

    await expect(eliminarDocumento(documento)).rejects.toThrow(DOCUMENTO_ELIMINAR_ERROR_MESSAGE)
    expect(supabase.storage.from).not.toHaveBeenCalled()
  })

  it('explica si el archivo ya está asociado a un pedido', async () => {
    mockSesion()
    mockDelete({
      data: null,
      error: { code: '23503', message: 'foreign key restrict' },
    })

    await expect(eliminarDocumento(documento)).rejects.toThrow(DOCUMENTO_EN_USO_ERROR_MESSAGE)
    expect(supabase.storage.from).not.toHaveBeenCalled()
  })

  it('explica un fallo genérico al eliminar', async () => {
    mockSesion()
    mockDelete({ data: null, error: { message: 'permission denied' } })

    await expect(eliminarDocumento(documento)).rejects.toThrow(DOCUMENTO_ELIMINAR_ERROR_MESSAGE)
  })

  it('no descarga un archivo de otro usuario', async () => {
    mockSesion()

    await expect(
      descargarDocumento({
        ...documento,
        usuario_id: 'otro-usuario',
        ubicacion_archivo: 'otro-usuario/receta.pdf',
      }),
    ).rejects.toThrow(DOCUMENTO_ACCESS_ERROR_MESSAGE)
    expect(supabase.storage.from).not.toHaveBeenCalled()
  })

  it('no marca recibida ni guarda si la receta no se puede leer', async () => {
    mockSesion()
    vi.mocked(evaluarCalidadArchivo).mockResolvedValue({
      ok: false,
      estado: DOCUMENTO_CALIDAD_INSUFICIENTE,
      motivo: 'borrosa',
      error: DOCUMENTO_CALIDAD_BORROSA_MESSAGE,
    })
    const jpeg = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], 'receta.jpg', {
      type: 'image/jpeg',
    })

    const rechazo = guardarDocumento('receta', jpeg)
    await expect(rechazo).rejects.toBeInstanceOf(CalidadInsuficienteError)
    await expect(rechazo).rejects.toThrow(DOCUMENTO_CALIDAD_BORROSA_MESSAGE)
    expect(supabase.functions.invoke).not.toHaveBeenCalled()
    expect(supabase.storage.from).not.toHaveBeenCalled()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('rechaza un formato no permitido antes de llamar a Storage', async () => {
    const rechazo = guardarDocumento(
      'examen',
      new File(['hola'], 'nota.txt', { type: 'text/plain' }),
    )
    await expect(rechazo).rejects.toBeInstanceOf(DocumentoCargaError)
    await expect(rechazo).rejects.toThrow(DOCUMENTO_FORMAT_ERROR_MESSAGE)
    expect(supabase.storage.from).not.toHaveBeenCalled()
    expect(supabase.functions.invoke).not.toHaveBeenCalled()
  })
})

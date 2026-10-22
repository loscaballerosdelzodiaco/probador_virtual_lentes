import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../lib/supabase'
import {
  DOCUMENTO_REGISTRO_ERROR_MESSAGE,
  DOCUMENTOS_LOAD_ERROR_MESSAGE,
  buildDocumentoInsert,
  listarDocumentos,
  listarValidacion,
  registrarDocumento,
} from '../services/documentoService'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
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
  estado_recepcion: 'pendiente' as const,
}

describe('documentoService', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
  })

  it('registra el archivo como pendiente y conserva la ruta del usuario', () => {
    expect(
      buildDocumentoInsert({
        usuario_id: usuarioId,
        nombre_archivo: ' receta.pdf ',
        tipo: 'examen',
        ubicacion_archivo: ` ${usuarioId}/examen.webp `,
      }),
    ).toEqual({
      usuario_id: usuarioId,
      nombre_archivo: 'receta.pdf',
      tipo: 'examen',
      ubicacion_archivo: `${usuarioId}/examen.webp`,
      estado_recepcion: 'pendiente',
    })
  })

  it('lista los documentos del usuario de más reciente a más antiguo', async () => {
    const order = vi.fn().mockReturnValue({
      returns: vi.fn().mockResolvedValue({ data: [documento], error: null }),
    })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    vi.mocked(supabase.from).mockReturnValue({ select } as never)

    await expect(listarDocumentos(usuarioId)).resolves.toEqual([documento])
    expect(supabase.from).toHaveBeenCalledWith('documento')
    expect(eq).toHaveBeenCalledWith('usuario_id', usuarioId)
    expect(order).toHaveBeenCalledWith('fecha_carga', { ascending: false })
  })

  it('explica el fallo al cargar documentos sin el detalle técnico', async () => {
    const order = vi.fn().mockReturnValue({
      returns: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'permission denied for table documento' },
      }),
    })
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ order }),
      }),
    } as never)

    await expect(listarDocumentos(usuarioId)).rejects.toThrow(
      DOCUMENTOS_LOAD_ERROR_MESSAGE,
    )
  })

  it('inserta el documento pendiente y devuelve la fila creada', async () => {
    const single = vi.fn().mockResolvedValue({ data: documento, error: null })
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        returns: vi.fn().mockReturnValue({ single }),
      }),
    })
    vi.mocked(supabase.from).mockReturnValue({ insert } as never)

    await expect(
      registrarDocumento({
        usuario_id: usuarioId,
        nombre_archivo: 'receta.pdf',
        tipo: 'receta',
        ubicacion_archivo: documento.ubicacion_archivo,
      }),
    ).resolves.toEqual(documento)
    expect(supabase.from).toHaveBeenCalledWith('documento')
    expect(insert).toHaveBeenCalledWith({
      usuario_id: usuarioId,
      nombre_archivo: 'receta.pdf',
      tipo: 'receta',
      ubicacion_archivo: documento.ubicacion_archivo,
      estado_recepcion: 'pendiente',
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
        usuario_id: usuarioId,
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
})

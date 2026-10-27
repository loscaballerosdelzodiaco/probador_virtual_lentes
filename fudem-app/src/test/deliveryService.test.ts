import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../lib/supabase'
import {
  ENTREGA_AJENO_ERROR_MESSAGE,
  ENTREGA_DUPLICADA_ERROR_MESSAGE,
  ENTREGA_GUARDADO_ERROR_MESSAGE,
  ENTREGA_PAGO_ERROR_MESSAGE,
  ENTREGA_PEDIDO_ERROR_MESSAGE,
  ENTREGA_SESION_ERROR_MESSAGE,
  ENTREGA_SUCURSAL_INACTIVA_ERROR_MESSAGE,
  EntregaError,
  registrarEntrega,
} from '../services/deliveryService'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}))

const USUARIO = '11111111-1111-1111-1111-111111111111'
const OTRO = '22222222-2222-2222-2222-222222222222'

type DbResult = {
  data: unknown
  error: { message: string; code?: string } | null
}

type TablaMock = {
  /** Resultado de select/maybeSingle. */
  lectura: DbResult
  /** Resultado de insert/single. Si falta, se reutiliza la lectura. */
  escritura?: DbResult
}

const sinFila: DbResult = { data: null, error: null }

function mockSesion(usuarioId: string | null) {
  vi.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user: usuarioId ? { id: usuarioId } : null },
    error: null,
  } as never)
}

function mockTablas(tablas: Record<string, TablaMock>) {
  const inserts: unknown[] = []
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    const handler = tablas[table] ?? { lectura: sinFila }
    const api = {
      select: vi.fn(() => api),
      eq: vi.fn(() => api),
      insert: vi.fn((row: unknown) => {
        inserts.push(row)
        return api
      }),
      maybeSingle: vi.fn(async () => handler.lectura),
      single: vi.fn(async () => handler.escritura ?? handler.lectura),
    }
    return api as never
  })
  return inserts
}

const pedidoPagado = {
  id: 15,
  usuario_id: USUARIO,
  forma_pago: 'tarjeta',
}

const municipioSs = { id: 2, departamento_id: 1 }

function entregaGuardada(parcial: Record<string, unknown>) {
  return {
    id: 90,
    pedido_id: 15,
    tipo: 'domicilio',
    departamento_id: 1,
    municipio_id: 2,
    direccion: 'Colonia Escalón, calle El Mirador, casa 123',
    telefono: '70000000',
    sucursal_id: null,
    fecha_registro: '2026-10-26T22:00:00.000Z',
    ...parcial,
  }
}

describe('registrarEntrega', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
    vi.mocked(supabase.auth.getUser).mockReset()
  })

  it('guarda un domicilio y deja la sucursal en null', async () => {
    mockSesion(USUARIO)
    const guardada = entregaGuardada({})
    const inserts = mockTablas({
      pedido: { lectura: { data: pedidoPagado, error: null } },
      entrega: { lectura: sinFila, escritura: { data: guardada, error: null } },
      municipio: { lectura: { data: municipioSs, error: null } },
    })

    const entrega = await registrarEntrega(15, {
      tipo: 'domicilio',
      departamentoId: 1,
      municipioId: 2,
      direccion: '  Colonia Escalón, calle El Mirador, casa 123  ',
      telefono: '7000-0000',
    })

    expect(inserts).toEqual([
      {
        pedido_id: 15,
        tipo: 'domicilio',
        departamento_id: 1,
        municipio_id: 2,
        direccion: 'Colonia Escalón, calle El Mirador, casa 123',
        telefono: '70000000',
        sucursal_id: null,
      },
    ])
    expect(entrega.sucursalId).toBeNull()
    expect(entrega.direccion).toBe('Colonia Escalón, calle El Mirador, casa 123')
    expect(entrega.telefono).toBe('70000000')
    expect(entrega.departamentoId).toBe(1)
    expect(entrega.municipioId).toBe(2)
  })

  it('guarda un retiro en sucursal activa y deja dirección y teléfono en null', async () => {
    mockSesion(USUARIO)
    const guardada = entregaGuardada({
      tipo: 'sucursal',
      departamento_id: null,
      municipio_id: null,
      direccion: null,
      telefono: null,
      sucursal_id: 3,
    })
    const inserts = mockTablas({
      pedido: { lectura: { data: pedidoPagado, error: null } },
      entrega: { lectura: sinFila, escritura: { data: guardada, error: null } },
      sucursal: { lectura: { data: { id: 3, activa: true }, error: null } },
    })

    const entrega = await registrarEntrega('15', {
      tipo: 'sucursal',
      sucursalId: 3,
    })

    expect(inserts).toEqual([
      {
        pedido_id: 15,
        tipo: 'sucursal',
        departamento_id: null,
        municipio_id: null,
        direccion: null,
        telefono: null,
        sucursal_id: 3,
      },
    ])
    expect(entrega.sucursalId).toBe(3)
    expect(entrega.direccion).toBeNull()
    expect(entrega.telefono).toBeNull()
    expect(entrega.departamentoId).toBeNull()
    expect(entrega.municipioId).toBeNull()
  })

  it('rechaza un pedido sin forma de pago y no inserta la entrega', async () => {
    mockSesion(USUARIO)
    const inserts = mockTablas({
      pedido: { lectura: { data: { ...pedidoPagado, forma_pago: null }, error: null } },
    })

    const error = await registrarEntrega(15, {
      tipo: 'domicilio',
      departamentoId: 1,
      municipioId: 2,
      direccion: 'Colonia Escalón, casa 123',
      telefono: '70000000',
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(EntregaError)
    expect(error).toMatchObject({
      message: ENTREGA_PAGO_ERROR_MESSAGE,
      status: 422,
      code: 'sin_forma_pago',
    })
    expect(inserts).toEqual([])
    expect(supabase.from).not.toHaveBeenCalledWith('entrega')
  })

  it('rechaza una sucursal inactiva y no inserta la entrega', async () => {
    mockSesion(USUARIO)
    const inserts = mockTablas({
      pedido: { lectura: { data: pedidoPagado, error: null } },
      entrega: { lectura: sinFila },
      sucursal: { lectura: { data: { id: 4, activa: false }, error: null } },
    })

    const error = await registrarEntrega(15, {
      tipo: 'sucursal',
      sucursalId: 4,
    }).catch((caught: unknown) => caught)

    expect(error).toMatchObject({
      message: ENTREGA_SUCURSAL_INACTIVA_ERROR_MESSAGE,
      status: 422,
      code: 'sucursal_inactiva',
    })
    expect(inserts).toEqual([])
  })

  it('exige sesión y no consulta pedidos sin ella', async () => {
    mockSesion(null)

    await expect(
      registrarEntrega(15, { tipo: 'sucursal', sucursalId: 3 }),
    ).rejects.toMatchObject({
      message: ENTREGA_SESION_ERROR_MESSAGE,
      status: 401,
      code: 'sesion',
    })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('rechaza el pedido de otro cliente', async () => {
    mockSesion(USUARIO)
    const inserts = mockTablas({
      pedido: { lectura: { data: { ...pedidoPagado, usuario_id: OTRO }, error: null } },
    })

    await expect(
      registrarEntrega(15, { tipo: 'sucursal', sucursalId: 3 }),
    ).rejects.toMatchObject({
      message: ENTREGA_AJENO_ERROR_MESSAGE,
      status: 403,
      code: 'ajeno',
    })
    expect(inserts).toEqual([])
  })

  it('responde 404 si el pedido no existe', async () => {
    mockSesion(USUARIO)
    mockTablas({ pedido: { lectura: sinFila } })

    await expect(
      registrarEntrega(15, { tipo: 'sucursal', sucursalId: 3 }),
    ).rejects.toMatchObject({
      message: ENTREGA_PEDIDO_ERROR_MESSAGE,
      status: 404,
      code: 'pedido_inexistente',
    })
  })

  it('no permite una segunda entrega', async () => {
    mockSesion(USUARIO)
    const inserts = mockTablas({
      pedido: { lectura: { data: pedidoPagado, error: null } },
      entrega: { lectura: { data: { id: 90 }, error: null } },
    })

    await expect(
      registrarEntrega(15, { tipo: 'sucursal', sucursalId: 3 }),
    ).rejects.toMatchObject({
      message: ENTREGA_DUPLICADA_ERROR_MESSAGE,
      status: 409,
      code: 'entrega_registrada',
    })
    expect(inserts).toEqual([])
  })

  it('trata como entrega ya registrada si dos altas chocan a la vez', async () => {
    mockSesion(USUARIO)
    const inserts = mockTablas({
      pedido: { lectura: { data: pedidoPagado, error: null } },
      entrega: {
        lectura: sinFila,
        escritura: {
          data: null,
          error: { message: 'duplicate key value violates unique constraint', code: '23505' },
        },
      },
      sucursal: { lectura: { data: { id: 3, activa: true }, error: null } },
    })

    await expect(
      registrarEntrega(15, { tipo: 'sucursal', sucursalId: 3 }),
    ).rejects.toMatchObject({
      message: ENTREGA_DUPLICADA_ERROR_MESSAGE,
      status: 409,
      code: 'entrega_registrada',
    })
    expect(inserts).toHaveLength(1)
  })

  it('oculta el error interno si el guardado falla', async () => {
    mockSesion(USUARIO)
    mockTablas({
      pedido: { lectura: { data: pedidoPagado, error: null } },
      entrega: {
        lectura: sinFila,
        escritura: {
          data: null,
          error: { message: 'permission denied for table entrega', code: '42501' },
        },
      },
      sucursal: { lectura: { data: { id: 3, activa: true }, error: null } },
    })

    const error = await registrarEntrega(15, {
      tipo: 'sucursal',
      sucursalId: 3,
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(EntregaError)
    expect((error as EntregaError).message).toBe(ENTREGA_GUARDADO_ERROR_MESSAGE)
    expect((error as EntregaError).status).toBe(500)
    expect((error as EntregaError).message).not.toContain('permission')
  })
})

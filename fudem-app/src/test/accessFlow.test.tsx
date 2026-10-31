import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import {
  LOGIN_ERROR_MESSAGE,
  SESSION_ERROR_MESSAGE,
  getCurrentSession,
  signIn,
  subscribeToAuthChanges,
} from '../services/authService'
import { getAvailableProductById } from '../services/productService'
import { registrarUsuario } from '../services/registroService'
import { fakeSession } from './authMocks'

vi.mock('../services/authService', () => ({
  SESSION_ERROR_MESSAGE:
    'No pudimos validar tu sesión. Inténtalo de nuevo en unos momentos.',
  LOGIN_ERROR_MESSAGE:
    'No pudimos iniciar sesión. Revisa tu correo y contraseña.',
  getCurrentSession: vi.fn(),
  subscribeToAuthChanges: vi.fn(() => () => {}),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('../services/productService', () => ({
  CATALOG_LOAD_ERROR_MESSAGE:
    'No pudimos cargar el catálogo. Inténtalo de nuevo en unos momentos.',
  getAvailableProducts: vi.fn(async () => []),
  getAvailableProductById: vi.fn(),
}))

vi.mock('../services/registroService', () => ({
  REGISTRO_ERROR_MESSAGE:
    'No pudimos crear tu cuenta. Inténtalo de nuevo en unos momentos.',
  registrarUsuario: vi.fn(),
}))

vi.mock('../services/orderService', () => ({
  PEDIDO_ENTREGA_LOAD_ERROR_MESSAGE:
    'No pudimos cargar el resumen de entrega. Inténtalo de nuevo en unos momentos.',
  getPedidoConEntrega: vi.fn(async () => null),
  getUltimoPedidoConEntrega: vi.fn(async () => null),
  createOrder: vi.fn(),
  recordPayment: vi.fn(),
}))

vi.mock('../services/deliveryService', () => ({
  registrarEntrega: vi.fn(),
}))

vi.mock('../hooks/useDeliveryCatalogs', () => ({
  useDeliveryCatalogs: () => ({
    departamentos: [],
    municipios: [],
    sucursales: [],
    loading: false,
    error: null,
  }),
}))

vi.mock('../services/documentoService', () => ({
  DOCUMENTOS_LOAD_ERROR_MESSAGE:
    'No pudimos cargar tus recetas y exámenes. Inténtalo de nuevo en unos momentos.',
  DOCUMENTO_REGISTRO_ERROR_MESSAGE:
    'No pudimos registrar el archivo. Inténtalo de nuevo en unos momentos.',
  listarDocumentos: vi.fn(async () => []),
  listarIdsDocumentoEnPedidos: vi.fn(async () => []),
  recetaAceptadaDe: vi.fn(() => null),
  guardarDocumento: vi.fn(),
  descargarDocumento: vi.fn(),
  eliminarDocumento: vi.fn(),
  obtenerRecetaAceptada: vi.fn(async () => ({
    id: 44,
    usuario_id: '11111111-1111-1111-1111-111111111111',
    nombre_archivo: 'receta.pdf',
    tipo: 'receta',
    fecha_carga: '2026-10-22T04:00:00.000Z',
    ubicacion_archivo: '11111111-1111-1111-1111-111111111111/receta/secret.pdf',
    estado_recepcion: 'recibida',
  })),
}))

async function fillRegistro() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('DUI'), '00000000-0')
  await user.type(screen.getByLabelText('Nombre'), 'Ana')
  await user.type(screen.getByLabelText('Apellido'), 'Lopez')
  await user.type(screen.getByLabelText('Fecha de nacimiento'), '1990-01-01')
  await user.type(screen.getByLabelText('Correo / Usuario'), 'ana@test.com')
  await user.type(screen.getByLabelText('Teléfono'), '7000-0000')
  await user.type(screen.getByLabelText('Contraseña'), '12345678')
  await user.type(screen.getByLabelText('Confirmar contraseña'), '12345678')
  await user.click(screen.getByRole('button', { name: 'Registrarse' }))
  return user
}

describe('flujo de acceso', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
    vi.mocked(getCurrentSession).mockReset()
    vi.mocked(subscribeToAuthChanges).mockReset()
    vi.mocked(subscribeToAuthChanges).mockReturnValue(() => {})
    vi.mocked(registrarUsuario).mockReset()
    vi.mocked(signIn).mockReset()
    vi.mocked(getAvailableProductById).mockReset()
    vi.mocked(getCurrentSession).mockResolvedValue(null)
  })

  it('muestra el registro y bloquea el catálogo sin sesión', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Catálogo de lentes' })).not.toBeInTheDocument()
  })

  it('redirige al login si se abre la entrega sin sesión', async () => {
    window.history.replaceState(null, '', '/entrega')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Forma de entrega' })).not.toBeInTheDocument()
  })

  it('redirige al login si se abren las recetas sin sesión', async () => {
    window.history.replaceState(null, '', '/documentos')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Recetas y exámenes' })).not.toBeInTheDocument()
  })

  it('redirige al login si se abre el catálogo sin sesión', async () => {
    window.history.replaceState(null, '', '/catalogo')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Catálogo de lentes' })).not.toBeInTheDocument()
  })

  it('redirige al login si se abre el probador sin sesión', async () => {
    window.history.replaceState(null, '', '/probador#4')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Probador virtual' })).not.toBeInTheDocument()
  })

  it('abre el probador cuando ya hay una sesión válida', async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(fakeSession)
    window.history.replaceState(null, '', '/probador#4')
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Probador virtual' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Catálogo de lentes' })).not.toBeInTheDocument()
    expect(screen.queryByText(/se integrará en un siguiente paso/)).not.toBeInTheDocument()
  })

  it('redirige al login si se abre el pago sin sesión (T10)', async () => {
    window.history.replaceState(null, '', '/pago#4')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
    expect(screen.queryByRole('heading', { name: 'Pago' })).not.toBeInTheDocument()
    expect(getAvailableProductById).not.toHaveBeenCalled()
  })

  it('abre la pantalla de pago con el producto y su precio cuando hay sesión (T10)', async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(fakeSession)
    vi.mocked(getAvailableProductById).mockResolvedValue({
      id: 4,
      nombre: 'aro de prueba',
      precio: 99,
      sku: 'SKU-4',
      material: 'Metal',
      color: 'Negro',
      medidas: '50-20',
      categoria: 'Hombre',
      url_imagen: 'ARNETTEAN7225.webp',
      disponible: true,
    })
    window.history.replaceState(null, '', '/pago#4')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Pago' })).toBeInTheDocument()
    expect(await screen.findByText('aro de prueba')).toBeInTheDocument()
    expect(getAvailableProductById).toHaveBeenCalledWith(4)
    expect(screen.queryByRole('heading', { name: 'Catálogo de lentes' })).not.toBeInTheDocument()
  })

  it('avisa en el pago si la aro no existe o no tiene precio (T10)', async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(fakeSession)
    vi.mocked(getAvailableProductById).mockResolvedValue(null)
    window.history.replaceState(null, '', '/pago#99')
    render(<App />)

    expect(
      await screen.findByText(/No encontramos esta aro disponible para comprar/),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al catálogo' })).toHaveAttribute(
      'href',
      '/catalogo',
    )
    expect(screen.queryByText('Forma de pago')).not.toBeInTheDocument()
  })
  
  it('abre recetas y exámenes cuando ya hay una sesión válida', async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(fakeSession)
    window.history.replaceState(null, '', '/documentos')
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Recetas y exámenes' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Catálogo de lentes' })).not.toBeInTheDocument()
  })

  it('abre el catálogo cuando ya hay una sesión válida', async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(fakeSession)
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Catálogo de lentes' }),
    ).toBeInTheDocument()
  })

  it('no concede acceso si falla la validación de sesión', async () => {
    vi.mocked(getCurrentSession).mockRejectedValue(new Error(SESSION_ERROR_MESSAGE))
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent(SESSION_ERROR_MESSAGE)
    expect(screen.queryByRole('heading', { name: 'Catálogo de lentes' })).not.toBeInTheDocument()
  })

  it('cierra el catálogo cuando la sesión expira', async () => {
    let onSession: ((session: Session | null) => void) | undefined
    vi.mocked(getCurrentSession).mockResolvedValue(fakeSession)
    vi.mocked(subscribeToAuthChanges).mockImplementation((callback) => {
      onSession = callback
      return () => {}
    })

    render(<App />)
    expect(
      await screen.findByRole('heading', { name: 'Catálogo de lentes' }),
    ).toBeInTheDocument()

    onSession?.(null)

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Catálogo de lentes' })).not.toBeInTheDocument()
  })

  it('entra al catálogo si el registro deja una sesión válida', async () => {
    vi.mocked(registrarUsuario).mockResolvedValue({ session: fakeSession })
    render(<App />)
    await screen.findByRole('heading', { name: 'Crear cuenta' })
    await fillRegistro()

    expect(
      await screen.findByRole('heading', { name: 'Catálogo de lentes' }),
    ).toBeInTheDocument()
  })

  it('no abre el catálogo si el registro no inicia sesión', async () => {
    vi.mocked(registrarUsuario).mockResolvedValue({ session: null })
    render(<App />)
    await screen.findByRole('heading', { name: 'Crear cuenta' })
    await fillRegistro()

    expect(
      await screen.findByText(/Cuenta creada. Inicia sesión para acceder al catálogo./),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Catálogo de lentes' })).not.toBeInTheDocument()
  })

  it('entra al catálogo al iniciar sesión con credenciales válidas', async () => {
    vi.mocked(signIn).mockResolvedValue(fakeSession)
    window.history.replaceState(null, '', '/login')
    render(<App />)
    await screen.findByRole('heading', { name: 'Iniciar sesión' })

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Correo'), 'ana@test.com')
    await user.type(screen.getByLabelText('Contraseña'), '12345678')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(
      await screen.findByRole('heading', { name: 'Catálogo de lentes' }),
    ).toBeInTheDocument()
  })

  it('muestra el error de Supabase con credenciales incorrectas', async () => {
    vi.mocked(signIn).mockRejectedValue(new Error(LOGIN_ERROR_MESSAGE))
    window.history.replaceState(null, '', '/login')
    render(<App />)
    await screen.findByRole('heading', { name: 'Iniciar sesión' })

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Correo'), 'ana@test.com')
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(LOGIN_ERROR_MESSAGE)
    expect(screen.queryByRole('heading', { name: 'Catálogo de lentes' })).not.toBeInTheDocument()
  })

  it('evita envíos duplicados mientras registra', async () => {
    let finish: ((value: { session: Session | null }) => void) | undefined
    vi.mocked(registrarUsuario).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    render(<App />)
    await screen.findByRole('heading', { name: 'Crear cuenta' })
    await fillRegistro()

    expect(screen.getByRole('button', { name: 'Registrando…' })).toBeDisabled()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Registrando…' }))
    expect(registrarUsuario).toHaveBeenCalledTimes(1)
    finish?.({ session: null })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Registrarse' })).toBeEnabled()
    })
  })
})

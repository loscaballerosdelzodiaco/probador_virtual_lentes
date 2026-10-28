import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isProtectedRoute, readAppRoute } from '../lib/appRoute'
import { RETURN_MESSAGES } from '../lib/returns/messages'
import { ReturnsPage } from '../pages/ReturnsPage'
import {
  createDevolucion,
  getMisDevoluciones,
  getPedidosEntregados,
  type Devolucion,
  type PedidoEntregado,
} from '../services/returnService'

vi.mock('../services/returnService', () => ({
  getPedidosEntregados: vi.fn(),
  getMisDevoluciones: vi.fn(),
  createDevolucion: vi.fn(),
}))

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('radio', { name: /PED-000001/ }))
  await user.selectOptions(screen.getByLabelText('Motivo de la devolución'), 'Llegó dañado')
  await user.click(screen.getByRole('radio', { name: 'Reembolso' }))
  await user.click(screen.getByRole('checkbox'))
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

const pedidoVigente: PedidoEntregado = {
  id: 1,
  numero: 'PED-000001',
  monto: 75,
  estado: 'entregado',
  fechaEntrega: daysAgo(2),
  productoNombre: 'Wayfarer Negro',
}

const pedidoVencido: PedidoEntregado = {
  id: 2,
  numero: 'PED-000002',
  monto: 90,
  estado: 'entregado',
  fechaEntrega: daysAgo(20),
  productoNombre: 'Aviador Classic',
}

const pedidoConDevolucion: PedidoEntregado = {
  id: 3,
  numero: 'PED-000003',
  monto: 60,
  estado: 'entregado',
  fechaEntrega: daysAgo(1),
  productoNombre: 'Redondo Negro',
}

const devolucionExistente: Devolucion = {
  id: 10,
  pedidoId: 3,
  numeroPedido: 'PED-000003',
  productoNombre: 'Redondo Negro',
  motivo: 'Llegó dañado',
  forma: 'reembolso',
  comentarios: null,
  estado: 'en revision',
  fechaSolicitud: daysAgo(0),
}

describe('ReturnsPage', () => {
  beforeEach(() => {
    vi.mocked(getPedidosEntregados).mockReset()
    vi.mocked(getMisDevoluciones).mockReset()
    vi.mocked(createDevolucion).mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('A3: avisa cuando el cliente no tiene pedidos entregados', async () => {
    vi.mocked(getPedidosEntregados).mockResolvedValue([])
    vi.mocked(getMisDevoluciones).mockResolvedValue([])

    render(<ReturnsPage />)

    expect(
      await screen.findByText('No tienes pedidos disponibles para devolución'),
    ).toBeInTheDocument()
  })

  it('CA1: lista los pedidos entregados que devuelve el servicio', async () => {
    vi.mocked(getPedidosEntregados).mockResolvedValue([pedidoVigente, pedidoVencido])
    vi.mocked(getMisDevoluciones).mockResolvedValue([])

    render(<ReturnsPage />)

    expect(await screen.findByText(/PED-000001 · Wayfarer Negro/)).toBeInTheDocument()
    expect(screen.getByText(/PED-000002 · Aviador Classic/)).toBeInTheDocument()
  })

  it('A1 / CA3: un pedido fuera de plazo muestra el motivo y no deja solicitar', async () => {
    const user = userEvent.setup()
    vi.mocked(getPedidosEntregados).mockResolvedValue([pedidoVencido])
    vi.mocked(getMisDevoluciones).mockResolvedValue([])

    render(<ReturnsPage />)
    await user.click(await screen.findByRole('radio', { name: /PED-000002/ }))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Este pedido ya no cumple el plazo de devolución')
    expect(
      screen.queryByRole('button', { name: 'Solicitar devolución' }),
    ).not.toBeInTheDocument()
  })

  it('A2 / RN4: un pedido con devolución en proceso no deja solicitar', async () => {
    const user = userEvent.setup()
    vi.mocked(getPedidosEntregados).mockResolvedValue([pedidoConDevolucion])
    vi.mocked(getMisDevoluciones).mockResolvedValue([devolucionExistente])

    render(<ReturnsPage />)
    await user.click(await screen.findByRole('radio', { name: /PED-000003/ }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Este pedido ya tiene una devolución solicitada',
    )
    expect(
      screen.queryByRole('button', { name: 'Solicitar devolución' }),
    ).not.toBeInTheDocument()
  })

  it('CA2: un pedido que cumple muestra el formulario con el botón habilitado', async () => {
    const user = userEvent.setup()
    vi.mocked(getPedidosEntregados).mockResolvedValue([pedidoVigente])
    vi.mocked(getMisDevoluciones).mockResolvedValue([])

    render(<ReturnsPage />)
    await user.click(await screen.findByRole('radio', { name: /PED-000001/ }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Motivo de la devolución')).toBeEnabled()
    expect(screen.getByRole('group', { name: 'Forma de devolución' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Solicitar devolución' })).toBeEnabled()
  })

  it('RN1: un pedido no entregado muestra el motivo y no deja solicitar', async () => {
    const user = userEvent.setup()
    vi.mocked(getPedidosEntregados).mockResolvedValue([
      { ...pedidoVigente, estado: 'pagado', fechaEntrega: null },
    ])
    vi.mocked(getMisDevoluciones).mockResolvedValue([])

    render(<ReturnsPage />)
    await user.click(await screen.findByRole('radio', { name: /PED-000001/ }))

    expect(screen.getByRole('alert')).toHaveTextContent('Este pedido aún no ha sido entregado')
    expect(
      screen.queryByRole('button', { name: 'Solicitar devolución' }),
    ).not.toBeInTheDocument()
  })

  it('RN3 / RN5: exige motivo, forma y confirmación antes de enviar', async () => {
    const user = userEvent.setup()
    vi.mocked(getPedidosEntregados).mockResolvedValue([pedidoVigente])
    vi.mocked(getMisDevoluciones).mockResolvedValue([])

    render(<ReturnsPage />)
    await user.click(await screen.findByRole('radio', { name: /PED-000001/ }))
    await user.click(screen.getByRole('button', { name: 'Solicitar devolución' }))

    const motivo = screen.getByLabelText('Motivo de la devolución')
    expect(motivo).toHaveAttribute('aria-invalid', 'true')
    expect(motivo).toHaveAccessibleDescription(
      'Motivo de la devolución: selecciona el motivo de la devolución.',
    )
    expect(motivo).toHaveFocus()
    expect(
      screen.getByRole('group', { name: 'Forma de devolución' }),
    ).toHaveAccessibleDescription('Forma de devolución: selecciona reembolso o cambio.')
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('checkbox')).toHaveAccessibleDescription(
      RETURN_MESSAGES.conditionsRequired,
    )
    expect(screen.getAllByRole('alert')).toHaveLength(3)
    expect(createDevolucion).not.toHaveBeenCalled()
  })

  it('sin forma de devolución: muestra el error junto al campo, lo enfoca y no envía', async () => {
    const user = userEvent.setup()
    vi.mocked(getPedidosEntregados).mockResolvedValue([pedidoVigente])
    vi.mocked(getMisDevoluciones).mockResolvedValue([])

    render(<ReturnsPage />)
    await user.click(await screen.findByRole('radio', { name: /PED-000001/ }))
    await user.selectOptions(screen.getByLabelText('Motivo de la devolución'), 'Otro')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Solicitar devolución' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Forma de devolución: selecciona reembolso o cambio.',
    )
    expect(screen.getByRole('radio', { name: 'Reembolso' })).toHaveFocus()
    expect(screen.getByRole('radio', { name: 'Reembolso' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByLabelText('Motivo de la devolución')).toHaveAttribute(
      'aria-invalid',
      'false',
    )
    expect(createDevolucion).not.toHaveBeenCalled()
  })

  it('RN3: sin confirmar las condiciones muestra el error, enfoca la casilla y no envía', async () => {
    const user = userEvent.setup()
    vi.mocked(getPedidosEntregados).mockResolvedValue([pedidoVigente])
    vi.mocked(getMisDevoluciones).mockResolvedValue([])

    render(<ReturnsPage />)
    await user.click(await screen.findByRole('radio', { name: /PED-000001/ }))
    await user.selectOptions(screen.getByLabelText('Motivo de la devolución'), 'Otro')
    await user.click(screen.getByRole('radio', { name: 'Reembolso' }))
    await user.click(screen.getByRole('button', { name: 'Solicitar devolución' }))

    expect(screen.getByRole('alert')).toHaveTextContent(RETURN_MESSAGES.conditionsRequired)
    expect(screen.getByRole('checkbox')).toHaveFocus()
    expect(createDevolucion).not.toHaveBeenCalled()

    await user.click(screen.getByRole('checkbox'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'false')
  })

  it('CA4 / CA5: registra la solicitud, muestra "En revisión" y la lista', async () => {
    const user = userEvent.setup()
    vi.mocked(getPedidosEntregados).mockResolvedValue([pedidoVigente])
    vi.mocked(getMisDevoluciones).mockResolvedValue([])
    vi.mocked(createDevolucion).mockResolvedValue({
      id: 11,
      pedidoId: 1,
      numeroPedido: 'PED-000001',
      productoNombre: 'Wayfarer Negro',
      motivo: 'No me queda bien',
      forma: 'cambio',
      comentarios: null,
      estado: 'en revision',
      fechaSolicitud: daysAgo(0),
    })

    render(<ReturnsPage />)
    await user.click(await screen.findByRole('radio', { name: /PED-000001/ }))
    await user.selectOptions(screen.getByLabelText('Motivo de la devolución'), 'No me queda bien')
    await user.click(screen.getByRole('radio', { name: 'Cambio por otro lente' }))
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Solicitar devolución' }))

    await waitFor(() =>
      expect(createDevolucion).toHaveBeenCalledWith({
        pedidoId: 1,
        motivo: 'No me queda bien',
        forma: 'cambio',
        comentarios: '',
      }),
    )
    expect(await screen.findByText('Solicitud registrada.')).toBeInTheDocument()
    expect(screen.getAllByText('En revisión').length).toBeGreaterThan(0)

    // A2 sin recargar: el pedido queda marcado con devolución activa.
    expect(
      within(screen.getByRole('radio', { name: /PED-000001/ }).closest('label')!).getByText(
        'Este pedido ya tiene una devolución solicitada',
      ),
    ).toBeInTheDocument()
    expect(getMisDevoluciones).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('tab', { name: /Mis solicitudes \(1\)/ }))
    expect(screen.getByText('Motivo: No me queda bien')).toBeInTheDocument()
    expect(screen.getByText('Forma: Cambio por otro lente')).toBeInTheDocument()
  })

  it('E1 / CA6: muestra el mensaje de error si no se pudo registrar', async () => {
    const user = userEvent.setup()
    vi.mocked(getPedidosEntregados).mockResolvedValue([pedidoVigente])
    vi.mocked(getMisDevoluciones).mockResolvedValue([])
    vi.mocked(createDevolucion).mockRejectedValue(
      new Error('No se pudo registrar la devolución, intenta de nuevo más tarde'),
    )

    render(<ReturnsPage />)
    await user.click(await screen.findByRole('radio', { name: /PED-000001/ }))
    await user.selectOptions(screen.getByLabelText('Motivo de la devolución'), 'Llegó dañado')
    await user.click(screen.getByRole('radio', { name: 'Reembolso' }))
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Solicitar devolución' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo registrar la devolución, intenta de nuevo más tarde',
    )
    expect(screen.queryByText('Solicitud registrada.')).not.toBeInTheDocument()
  })

  it.each([
    ['A1', RETURN_MESSAGES.outOfWindow],
    ['RN1', RETURN_MESSAGES.notDelivered],
  ])('%s desde la base: muestra el mensaje amigable', async (_caso, mensaje) => {
    const user = userEvent.setup()
    vi.mocked(getPedidosEntregados).mockResolvedValue([pedidoVigente])
    vi.mocked(getMisDevoluciones).mockResolvedValue([])
    vi.mocked(createDevolucion).mockRejectedValue(new Error(mensaje))

    render(<ReturnsPage />)
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Solicitar devolución' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(mensaje)
  })

  it('A2 desde la base: muestra el mensaje y recarga las solicitudes para marcar el pedido', async () => {
    const user = userEvent.setup()
    vi.mocked(getPedidosEntregados).mockResolvedValue([pedidoVigente])
    vi.mocked(getMisDevoluciones)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...devolucionExistente, pedidoId: 1, numeroPedido: 'PED-000001' }])
    vi.mocked(createDevolucion).mockRejectedValue(new Error(RETURN_MESSAGES.alreadyRequested))

    render(<ReturnsPage />)
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Solicitar devolución' }))

    await waitFor(() => expect(getMisDevoluciones).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este pedido ya tiene una devolución solicitada',
    )
    expect(
      screen.queryByRole('button', { name: 'Solicitar devolución' }),
    ).not.toBeInTheDocument()
  })

  it('E1: nunca muestra el texto técnico de un error inesperado', async () => {
    const user = userEvent.setup()
    vi.mocked(getPedidosEntregados).mockResolvedValue([pedidoVigente])
    vi.mocked(getMisDevoluciones).mockResolvedValue([])
    vi.mocked(createDevolucion).mockRejectedValue(new TypeError('Failed to fetch'))

    render(<ReturnsPage />)
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Solicitar devolución' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(RETURN_MESSAGES.saveError)
    expect(screen.queryByText(/Failed to fetch/)).not.toBeInTheDocument()
  })

  it('doble clic registra una sola vez y deshabilita el botón mientras envía', async () => {
    const user = userEvent.setup()
    vi.mocked(getPedidosEntregados).mockResolvedValue([pedidoVigente])
    vi.mocked(getMisDevoluciones).mockResolvedValue([])
    let terminar: (value: Devolucion) => void = () => {}
    vi.mocked(createDevolucion).mockReturnValue(
      new Promise<Devolucion>((resolve) => {
        terminar = resolve
      }),
    )

    render(<ReturnsPage />)
    await fillValidForm(user)
    await user.dblClick(screen.getByRole('button', { name: 'Solicitar devolución' }))

    expect(createDevolucion).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled()

    terminar({ ...devolucionExistente, id: 12, pedidoId: 1, numeroPedido: 'PED-000001' })
    expect(await screen.findByText('Solicitud registrada.')).toBeInTheDocument()
    expect(createDevolucion).toHaveBeenCalledTimes(1)
  })

  it('muestra un error amigable si falla la carga de pedidos', async () => {
    vi.mocked(getPedidosEntregados).mockRejectedValue(new Error('JWT expired'))
    vi.mocked(getMisDevoluciones).mockResolvedValue([])

    render(<ReturnsPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar tus pedidos entregados.',
    )
    expect(screen.queryByText(/JWT expired/)).not.toBeInTheDocument()
    expect(screen.queryByText('No tienes pedidos disponibles para devolución')).not.toBeInTheDocument()
  })

  it('muestra un error amigable si falla la carga de solicitudes', async () => {
    vi.mocked(getPedidosEntregados).mockResolvedValue([pedidoVigente])
    vi.mocked(getMisDevoluciones).mockRejectedValue(new Error('JWT expired'))

    render(<ReturnsPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar tus devoluciones.',
    )
    expect(screen.queryByText(/JWT expired/)).not.toBeInTheDocument()
  })

  it('T3: "Reintentar" vuelve a cargar los pedidos entregados', async () => {
    const user = userEvent.setup()
    vi.mocked(getPedidosEntregados)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([pedidoVigente])
    vi.mocked(getMisDevoluciones).mockResolvedValue([])

    render(<ReturnsPage />)
    await user.click(await screen.findByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText(/PED-000001 · Wayfarer Negro/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(getPedidosEntregados).toHaveBeenCalledTimes(2)
    expect(getMisDevoluciones).toHaveBeenCalledTimes(1)
  })
})

describe('ruta /devoluciones', () => {
  it('se reconoce y es protegida', () => {
    expect(readAppRoute('/devoluciones', '')).toEqual({ name: 'devoluciones' })
    expect(isProtectedRoute({ name: 'devoluciones' })).toBe(true)
  })
})

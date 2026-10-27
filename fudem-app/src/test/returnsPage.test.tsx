import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isProtectedRoute, readAppRoute } from '../lib/appRoute'
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

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

const pedidoVigente: PedidoEntregado = {
  id: 1,
  numero: 'PED-000001',
  monto: 75,
  fechaEntrega: daysAgo(2),
  productoNombre: 'Wayfarer Negro',
}

const pedidoVencido: PedidoEntregado = {
  id: 2,
  numero: 'PED-000002',
  monto: 90,
  fechaEntrega: daysAgo(20),
  productoNombre: 'Aviador Classic',
}

const pedidoConDevolucion: PedidoEntregado = {
  id: 3,
  numero: 'PED-000003',
  monto: 60,
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

  it('RN3 / RN5: exige motivo, forma y confirmación antes de enviar', async () => {
    const user = userEvent.setup()
    vi.mocked(getPedidosEntregados).mockResolvedValue([pedidoVigente])
    vi.mocked(getMisDevoluciones).mockResolvedValue([])

    render(<ReturnsPage />)
    await user.click(await screen.findByRole('radio', { name: /PED-000001/ }))
    await user.click(screen.getByRole('button', { name: 'Solicitar devolución' }))

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText('Selecciona el motivo de la devolución.')).toBeInTheDocument()
    expect(within(alert).getByText('Selecciona la forma de devolución.')).toBeInTheDocument()
    expect(
      within(alert).getByText(
        'Debes confirmar que los lentes están sin uso y en su empaque original.',
      ),
    ).toBeInTheDocument()
    expect(createDevolucion).not.toHaveBeenCalled()
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

  it('muestra un error amigable si falla la carga', async () => {
    vi.mocked(getPedidosEntregados).mockRejectedValue(new Error('JWT expired'))
    vi.mocked(getMisDevoluciones).mockResolvedValue([])

    render(<ReturnsPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar tus devoluciones.',
    )
    expect(screen.queryByText(/JWT expired/)).not.toBeInTheDocument()
  })
})

describe('ruta /devoluciones', () => {
  it('se reconoce y es protegida', () => {
    expect(readAppRoute('/devoluciones', '')).toEqual({ name: 'devoluciones' })
    expect(isProtectedRoute({ name: 'devoluciones' })).toBe(true)
  })
})

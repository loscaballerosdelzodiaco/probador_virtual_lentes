import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DeliverySummary } from '../components/DeliverySummary'
import { DeliveryPage } from '../pages/DeliveryPage'
import { registrarEntrega } from '../services/deliveryService'
import { PEDIDO_ENTREGA_LOAD_ERROR_MESSAGE, getPedidoConEntrega } from '../services/orderService'
import type { PedidoConEntrega } from '../lib/payment/orderStatus'

vi.mock('../hooks/useDeliveryCatalogs', () => ({
  useDeliveryCatalogs: () => ({
    departamentos: [{ id: '1', nombre: 'San Salvador' }],
    municipios: [{ id: '2', departamentoId: '1', nombre: 'San Salvador' }],
    sucursales: [
      {
        id: '3',
        nombre: 'FUDEM San Salvador',
        direccion: 'Alameda Juan Pablo II, local 12',
        activa: true,
      },
    ],
    loading: false,
    error: null,
  }),
}))

vi.mock('../services/orderService', async () => {
  const actual = await vi.importActual<typeof import('../services/orderService')>(
    '../services/orderService',
  )
  return {
    ...actual,
    getPedidoConEntrega: vi.fn(),
    getUltimoPedidoConEntrega: vi.fn(),
  }
})

vi.mock('../services/deliveryService', () => ({
  registrarEntrega: vi.fn(),
}))

const domicilio: PedidoConEntrega = {
  id: 15,
  numero: 'PED-000015',
  estado: 'pendiente de pago',
  entrega: {
    tipo: 'domicilio',
    departamento: 'San Salvador',
    municipio: 'Soyapango',
    direccion: 'Colonia Escalón, casa 123',
    telefono: '70000000',
  },
}

const retiro: PedidoConEntrega = {
  id: 16,
  numero: 'PED-000016',
  estado: 'pagado',
  entrega: {
    tipo: 'sucursal',
    sucursalNombre: 'FUDEM Santa Tecla',
    sucursalDireccion: 'Avenida Manuel Gallardo, centro comercial',
  },
}

describe('DeliverySummary', () => {
  it('muestra el resumen de un envío a domicilio', () => {
    render(<DeliverySummary entrega={domicilio.entrega} pedidoNumero={domicilio.numero} />)

    expect(screen.getByRole('heading', { name: 'Resumen de entrega' })).toBeInTheDocument()
    expect(screen.getByText('Pedido PED-000015')).toBeInTheDocument()
    expect(screen.getByText('Envío a domicilio')).toBeInTheDocument()
    expect(screen.getByText('San Salvador')).toBeInTheDocument()
    expect(screen.getByText('Soyapango')).toBeInTheDocument()
    expect(screen.getByText('Colonia Escalón, casa 123')).toBeInTheDocument()
    expect(screen.getByText('70000000')).toBeInTheDocument()
  })

  it('muestra el nombre y la dirección de la sucursal en un retiro', () => {
    render(<DeliverySummary entrega={retiro.entrega} pedidoNumero={retiro.numero} />)

    expect(screen.getByText('Retiro en sucursal')).toBeInTheDocument()
    expect(screen.getByText('FUDEM Santa Tecla')).toBeInTheDocument()
    expect(screen.getByText('Avenida Manuel Gallardo, centro comercial')).toBeInTheDocument()
    expect(screen.queryByText('Teléfono')).not.toBeInTheDocument()
  })
})

describe('recarga del pedido con entrega', () => {
  beforeEach(() => {
    vi.mocked(getPedidoConEntrega).mockReset()
    vi.mocked(registrarEntrega).mockReset()
  })

  it('vuelve a mostrar el resumen guardado y bloquea la edición', async () => {
    vi.mocked(getPedidoConEntrega).mockResolvedValue(domicilio)
    render(<DeliveryPage pedidoId={15} />)

    expect(await screen.findByText('Colonia Escalón, casa 123')).toBeInTheDocument()
    expect(screen.getByText('Pedido PED-000015')).toBeInTheDocument()
    expect(
      screen.getByText(
        'La forma de entrega de este pedido ya está confirmada y no se puede modificar.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Departamento')).not.toBeInTheDocument()
    expect(getPedidoConEntrega).toHaveBeenCalledWith(15)
  })

  it('avisa si el resumen no se puede obtener', async () => {
    vi.mocked(getPedidoConEntrega).mockRejectedValue(
      new Error(PEDIDO_ENTREGA_LOAD_ERROR_MESSAGE),
    )
    render(<DeliveryPage pedidoId={99} />)

    expect(await screen.findByText(PEDIDO_ENTREGA_LOAD_ERROR_MESSAGE)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()
    })
  })

  it('al confirmar guarda la entrega y muestra el resumen del pedido', async () => {
    const user = userEvent.setup()
    vi.mocked(getPedidoConEntrega)
      .mockResolvedValueOnce({ ...domicilio, entrega: null })
      .mockResolvedValueOnce(domicilio)
    vi.mocked(registrarEntrega).mockResolvedValue(undefined)

    render(<DeliveryPage pedidoId={15} />)

    await user.click(await screen.findByRole('radio', { name: /Envío a domicilio/i }))
    await user.selectOptions(screen.getByLabelText('Departamento'), '1')
    await user.selectOptions(screen.getByLabelText('Municipio'), '2')
    await user.type(screen.getByLabelText('Dirección de entrega'), 'Colonia Escalón, casa 123')
    await user.type(screen.getByLabelText('Teléfono de contacto'), '70000000')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('Colonia Escalón, casa 123')).toBeInTheDocument()
    expect(registrarEntrega).toHaveBeenCalledWith(
      15,
      expect.objectContaining({
        tipo: 'domicilio',
        direccion: 'Colonia Escalón, casa 123',
        telefono: '70000000',
      }),
    )
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument()
  })
})

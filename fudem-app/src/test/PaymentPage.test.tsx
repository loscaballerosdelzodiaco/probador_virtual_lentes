import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatPrice } from '../lib/payment/format'
import { PAYMENT_MESSAGES } from '../lib/payment/messages'
import {
  PaymentGatewayError,
  processPayment,
  type ResultadoPago,
} from '../lib/payment/paymentGateway'
import { PaymentPage } from '../pages/PaymentPage'
import { createOrder, recordPayment } from '../services/orderService'
import { getAvailableProductById } from '../services/productService'

vi.mock('../services/productService', () => ({
  getAvailableProductById: vi.fn(),
}))

vi.mock('../services/orderService', () => ({
  createOrder: vi.fn(),
  recordPayment: vi.fn(),
}))

vi.mock('../lib/payment/paymentGateway', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/payment/paymentGateway')>()),
  processPayment: vi.fn(),
}))

const sample = {
  id: 1,
  nombre: 'Montura de prueba',
  precio: 99,
  sku: 'SKU-1',
  material: 'Metal',
  color: 'Negro',
  medidas: '50-20',
  categoria: 'Hombre',
  url_imagen: 'ARNETTEAN7225.webp',
  disponible: true,
}

const cardPedido = {
  id: 7,
  numero: 'PED-000007',
  estado: 'pendiente de pago' as const,
}
const storePedido = {
  id: 8,
  numero: 'PED-000008',
  estado: 'pendiente de pago' as const,
}

const approved: ResultadoPago = { estado: 'aprobado', ultimos_digitos: '4242' }

beforeEach(() => {
  vi.mocked(getAvailableProductById).mockReset()
  vi.mocked(processPayment).mockReset()
  vi.mocked(createOrder).mockReset()
  vi.mocked(recordPayment).mockReset()
  vi.mocked(recordPayment).mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
})

async function openCardForm() {
  vi.mocked(getAvailableProductById).mockResolvedValue(sample)
  const view = render(<PaymentPage productId={1} />)
  await screen.findByRole('button', { name: 'Continuar' })
  fireEvent.click(
    screen.getByRole('radio', { name: /Tarjeta de crédito o débito/ }),
  )
  return view
}

function fillCard(number = '4242424242424242') {
  fireEvent.change(screen.getByLabelText('Número de tarjeta'), {
    target: { value: number },
  })
  fireEvent.change(screen.getByLabelText('Titular de la tarjeta'), {
    target: { value: 'Ana López' },
  })
  fireEvent.change(screen.getByLabelText('Vencimiento'), {
    target: { value: '1235' },
  })
  fireEvent.change(screen.getByLabelText('CVV'), { target: { value: '123' } })
}

function valueOf(label: string): string {
  return (screen.getByLabelText(label) as HTMLInputElement).value
}

describe('PaymentPage: resumen y selector', () => {
  it('muestra el resumen con el nombre y el precio del producto', async () => {
    vi.mocked(getAvailableProductById).mockResolvedValue(sample)

    render(<PaymentPage productId={1} />)

    expect(await screen.findByText('Montura de prueba', { selector: 'p' })).toBeTruthy()
    expect(screen.getAllByText(formatPrice(99))).toHaveLength(2)
    expect(getAvailableProductById).toHaveBeenCalledWith(1)
  })

  it('usa la imagen del catálogo en el resumen', async () => {
    vi.mocked(getAvailableProductById).mockResolvedValue(sample)

    const { container } = render(<PaymentPage productId={1} />)
    await screen.findByText('Montura de prueba', { selector: 'p' })

    const image = container.querySelector('.pay__summary-media img')
    expect(image?.getAttribute('src')).toBe('/catalog/ARNETTEAN7225.webp')
  })

  it('avisa cuando la montura no está disponible', async () => {
    vi.mocked(getAvailableProductById).mockResolvedValue(null)

    render(<PaymentPage productId={99} />)

    expect(await screen.findByText(/No encontramos esta montura/)).toBeTruthy()
    expect(screen.queryByText('Forma de pago')).toBeNull()
  })

  it('muestra el error si falla la consulta del producto', async () => {
    vi.mocked(getAvailableProductById).mockRejectedValue(
      new Error('No se pudo consultar el producto: JWT expired'),
    )

    render(<PaymentPage productId={1} />)

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('No se pudo consultar el producto')
    expect(screen.queryByText('Forma de pago')).toBeNull()
  })

  it('no permite pagar una montura sin precio', async () => {
    vi.mocked(getAvailableProductById).mockResolvedValue({
      ...sample,
      precio: null,
    })

    render(<PaymentPage productId={1} />)

    expect(await screen.findByText(/no tiene precio registrado/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Continuar' })).toBeNull()
  })

  it('pide seleccionar una montura si la ruta no trae id', () => {
    render(<PaymentPage productId={null} />)

    expect(screen.getByText(/No seleccionaste ninguna montura/)).toBeTruthy()
    expect(getAvailableProductById).not.toHaveBeenCalled()
  })

  it('no deja continuar sin forma de pago (E2)', async () => {
    vi.mocked(getAvailableProductById).mockResolvedValue(sample)

    render(<PaymentPage productId={1} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(PAYMENT_MESSAGES.noMethod)
    expect(createOrder).not.toHaveBeenCalled()
  })

  it('muestra el formulario de tarjeta solo con esa forma de pago', async () => {
    await openCardForm()
    expect(screen.getByLabelText('Número de tarjeta')).toBeTruthy()

    fireEvent.click(screen.getByRole('radio', { name: /Pago en tienda/ }))
    expect(screen.queryByLabelText('Número de tarjeta')).toBeNull()
    expect(screen.getByRole('button', { name: 'Confirmar pedido' })).toBeTruthy()
  })
})

describe('PaymentPage: registro del pedido', () => {
  it('registra el pedido y el pago aprobado, y muestra el número (CA1)', async () => {
    vi.mocked(createOrder).mockResolvedValue(cardPedido)
    vi.mocked(processPayment).mockResolvedValue(approved)

    await openCardForm()
    fillCard()
    fireEvent.click(screen.getByRole('button', { name: 'Pagar' }))

    expect(await screen.findByText(PAYMENT_MESSAGES.paid)).toBeTruthy()
    expect(screen.getByText('PED-000007')).toBeTruthy()
    expect(screen.getByText('Pagado')).toBeTruthy()
    expect(screen.getByText('Terminada en 4242')).toBeTruthy()
    expect(createOrder).toHaveBeenCalledWith({ productId: 1, formaPago: 'tarjeta' })
    expect(recordPayment).toHaveBeenCalledWith({
      pedidoId: 7,
      estado: 'aprobado',
      ultimosDigitos: '4242',
    })
  })

  it('crea el pedido antes de cobrar', async () => {
    vi.mocked(createOrder).mockResolvedValue(cardPedido)
    vi.mocked(processPayment).mockResolvedValue(approved)

    await openCardForm()
    fillCard()
    fireEvent.click(screen.getByRole('button', { name: 'Pagar' }))
    await screen.findByText('PED-000007')

    expect(vi.mocked(createOrder).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(processPayment).mock.invocationCallOrder[0],
    )
  })

  it('registra el pedido pendiente con pago en tienda, sin pasarela ni pago (A1)', async () => {
    vi.mocked(createOrder).mockResolvedValue(storePedido)
    vi.mocked(getAvailableProductById).mockResolvedValue(sample)

    render(<PaymentPage productId={1} />)
    await screen.findByRole('button', { name: 'Continuar' })
    fireEvent.click(screen.getByRole('radio', { name: /Pago en tienda/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    expect(await screen.findByText(PAYMENT_MESSAGES.storePending)).toBeTruthy()
    expect(screen.getByText('PED-000008')).toBeTruthy()
    expect(screen.getByText('Pendiente de pago')).toBeTruthy()
    expect(createOrder).toHaveBeenCalledWith({ productId: 1, formaPago: 'tienda' })
    expect(processPayment).not.toHaveBeenCalled()
    expect(recordPayment).not.toHaveBeenCalled()
  })

  it('no cobra si no se pudo crear el pedido', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(createOrder).mockRejectedValue(new Error('RLS'))

    await openCardForm()
    fillCard()
    fireEvent.click(screen.getByRole('button', { name: 'Pagar' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(PAYMENT_MESSAGES.orderFailed)
    expect(processPayment).not.toHaveBeenCalled()
    expect(screen.queryByText(PAYMENT_MESSAGES.paid)).toBeNull()
  })

  it('avisa si no se pudo guardar el pago aprobado y no muestra la confirmación', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(createOrder).mockResolvedValue(cardPedido)
    vi.mocked(processPayment).mockResolvedValue(approved)
    vi.mocked(recordPayment).mockRejectedValue(new Error('insert failed'))

    await openCardForm()
    fillCard()
    fireEvent.click(screen.getByRole('button', { name: 'Pagar' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(PAYMENT_MESSAGES.orderFailed)
    expect(screen.queryByText(PAYMENT_MESSAGES.paid)).toBeNull()
  })

  it('no crea pedido ni cobra si los datos de la tarjeta son inválidos (A2)', async () => {
    await openCardForm()
    fireEvent.click(screen.getByRole('button', { name: 'Pagar' }))

    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0)
    expect(createOrder).not.toHaveBeenCalled()
    expect(processPayment).not.toHaveBeenCalled()
  })

  it('registra un solo pedido y un solo pago aunque se envíe varias veces (CA7)', async () => {
    let release: (result: ResultadoPago) => void = () => {}
    vi.mocked(createOrder).mockResolvedValue(cardPedido)
    vi.mocked(processPayment).mockReturnValue(
      new Promise<ResultadoPago>((resolve) => {
        release = resolve
      }),
    )

    const { container } = await openCardForm()
    fillCard()

    const form = container.querySelector('form') as HTMLFormElement
    fireEvent.submit(form)
    fireEvent.submit(form)
    fireEvent.submit(form)

    await waitFor(() => expect(processPayment).toHaveBeenCalledTimes(1))
    expect(
      (screen.getByRole('button', { name: 'Procesando pago…' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)

    release(approved)
    expect(await screen.findByText('PED-000007')).toBeTruthy()
    expect(createOrder).toHaveBeenCalledTimes(1)
    expect(recordPayment).toHaveBeenCalledTimes(1)
  })
})

describe('PaymentPage: pago declinado o sin fondos (E1)', () => {
  it.each([
    ['declinada', '4000000000000002', '0002'],
    ['fondos_insuficientes', '4000000000009995', '9995'],
  ] as const)(
    'muestra la alerta y solo guarda un pago rechazado (%s)',
    async (motivo, number, last4) => {
      vi.mocked(createOrder).mockResolvedValue(cardPedido)
      vi.mocked(processPayment).mockResolvedValue({
        estado: 'rechazado',
        motivo,
        ultimos_digitos: last4,
      })

      await openCardForm()
      fillCard(number)
      fireEvent.click(screen.getByRole('button', { name: 'Pagar' }))

      const alert = await screen.findByRole('alert')
      expect(alert.textContent).toContain(PAYMENT_MESSAGES.declined)
      expect(recordPayment).toHaveBeenCalledTimes(1)
      expect(recordPayment).toHaveBeenCalledWith({
        pedidoId: 7,
        estado: 'rechazado',
        ultimosDigitos: last4,
      })
      expect(screen.queryByText(PAYMENT_MESSAGES.paid)).toBeNull()
      expect(screen.queryByText('Pagado')).toBeNull()
    },
  )

  it('muestra la alerta aunque falle el guardado del intento rechazado', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(createOrder).mockResolvedValue(cardPedido)
    vi.mocked(processPayment).mockResolvedValue({
      estado: 'rechazado',
      motivo: 'declinada',
      ultimos_digitos: '0002',
    })
    vi.mocked(recordPayment).mockRejectedValue(new Error('insert failed'))

    await openCardForm()
    fillCard('4000000000000002')
    fireEvent.click(screen.getByRole('button', { name: 'Pagar' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(PAYMENT_MESSAGES.declined)
  })

  it('borra número y CVV, conserva titular y vencimiento, y permite reintentar', async () => {
    vi.mocked(createOrder).mockResolvedValue(cardPedido)
    vi.mocked(processPayment).mockResolvedValue({
      estado: 'rechazado',
      motivo: 'declinada',
      ultimos_digitos: '0002',
    })

    await openCardForm()
    fillCard('4000000000000002')
    fireEvent.click(screen.getByRole('button', { name: 'Pagar' }))
    await screen.findByRole('alert')

    expect(valueOf('Número de tarjeta')).toBe('')
    expect(valueOf('CVV')).toBe('')
    expect(valueOf('Titular de la tarjeta')).toBe('Ana López')
    expect(valueOf('Vencimiento')).toBe('12/35')
    expect(
      (screen.getByRole('button', { name: 'Pagar' }) as HTMLButtonElement).disabled,
    ).toBe(false)
  })

  it('reutiliza el mismo pedido al pagar con otra tarjeta después del rechazo', async () => {
    vi.mocked(createOrder).mockResolvedValue(cardPedido)
    vi.mocked(processPayment)
      .mockResolvedValueOnce({
        estado: 'rechazado',
        motivo: 'fondos_insuficientes',
        ultimos_digitos: '9995',
      })
      .mockResolvedValueOnce(approved)

    await openCardForm()
    fillCard('4000000000009995')
    fireEvent.click(screen.getByRole('button', { name: 'Pagar' }))
    await screen.findByRole('alert')

    fireEvent.change(screen.getByLabelText('Número de tarjeta'), {
      target: { value: '4242424242424242' },
    })
    fireEvent.change(screen.getByLabelText('CVV'), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pagar' }))

    expect(await screen.findByText('PED-000007')).toBeTruthy()
    expect(createOrder).toHaveBeenCalledTimes(1)
    expect(recordPayment).toHaveBeenNthCalledWith(1, {
      pedidoId: 7,
      estado: 'rechazado',
      ultimosDigitos: '9995',
    })
    expect(recordPayment).toHaveBeenNthCalledWith(2, {
      pedidoId: 7,
      estado: 'aprobado',
      ultimosDigitos: '4242',
    })
  })

  it('informa que no hubo cobro cuando el servicio no responde y no guarda ningún pago (E3)', async () => {
    vi.mocked(createOrder).mockResolvedValue(cardPedido)
    vi.mocked(processPayment).mockRejectedValue(
      new PaymentGatewayError('sin_respuesta'),
    )

    await openCardForm()
    fillCard('4000000000000119')
    fireEvent.click(screen.getByRole('button', { name: 'Pagar' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(PAYMENT_MESSAGES.serviceUnavailable)
    expect(recordPayment).not.toHaveBeenCalled()
  })
})
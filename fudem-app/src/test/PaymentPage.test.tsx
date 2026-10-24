import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatPrice } from '../lib/payment/format'
import { PAYMENT_MESSAGES } from '../lib/payment/messages'
import { PaymentPage } from '../pages/PaymentPage'
import { getAvailableProductById } from '../services/productService'

vi.mock('../services/productService', () => ({
  getAvailableProductById: vi.fn(),
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

describe('PaymentPage', () => {
  beforeEach(() => {
    vi.mocked(getAvailableProductById).mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('muestra el resumen con el nombre y el precio del producto', async () => {
    vi.mocked(getAvailableProductById).mockResolvedValue(sample)

    render(<PaymentPage productId={1} />)

    expect(await screen.findByText('Montura de prueba', { selector: 'p' })).toBeTruthy()
    // Precio y Total muestran el mismo monto (RN1)
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
  })

  it('muestra el formulario de tarjeta solo con esa forma de pago', async () => {
    vi.mocked(getAvailableProductById).mockResolvedValue(sample)

    render(<PaymentPage productId={1} />)
    await screen.findByRole('button', { name: 'Continuar' })
    expect(screen.queryByLabelText('Número de tarjeta')).toBeNull()

    fireEvent.click(
      screen.getByRole('radio', { name: /Tarjeta de crédito o débito/ }),
    )
    expect(screen.getByLabelText('Número de tarjeta')).toBeTruthy()

    fireEvent.click(screen.getByRole('radio', { name: /Pago en tienda/ }))
    expect(screen.queryByLabelText('Número de tarjeta')).toBeNull()
    expect(screen.getByRole('button', { name: 'Confirmar pedido' })).toBeTruthy()
  })

  it('registra el pedido como pendiente con pago en tienda (A1)', async () => {
    vi.mocked(getAvailableProductById).mockResolvedValue(sample)

    render(<PaymentPage productId={1} />)
    await screen.findByRole('button', { name: 'Continuar' })

    fireEvent.click(screen.getByRole('radio', { name: /Pago en tienda/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    expect(await screen.findByText(PAYMENT_MESSAGES.storePending)).toBeTruthy()
    expect(screen.getByText('Pendiente de pago')).toBeTruthy()
  })
})
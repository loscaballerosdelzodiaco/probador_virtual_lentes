import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PAYMENT_MESSAGES } from '../lib/payment/messages'
import { processPayment } from '../lib/payment/paymentGateway'
import { PaymentPage } from '../pages/PaymentPage'
import { obtenerRecetaAceptada } from '../services/documentoService'
import { createOrder, recordPayment } from '../services/orderService'
import { getAvailableProductById } from '../services/productService'

vi.mock('../services/productService', () => ({
  getAvailableProductById: vi.fn(),
}))

vi.mock('../services/orderService', () => ({
  createOrder: vi.fn(),
  recordPayment: vi.fn(),
}))

vi.mock('../services/documentoService', () => ({
  obtenerRecetaAceptada: vi.fn(),
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

async function renderCardForm() {
  const user = userEvent.setup()
  render(<PaymentPage productId={1} />)
  await user.click(
    await screen.findByRole('radio', { name: /Tarjeta de crédito o débito/ }),
  )
  return user
}

async function fillCard(
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<Record<'numero' | 'titular' | 'vencimiento' | 'cvv', string>> = {},
) {
  const card = {
    numero: '4242424242424242',
    titular: 'Ana López',
    vencimiento: '1228',
    cvv: '123',
    ...overrides,
  }
  if (card.numero) await user.type(screen.getByLabelText('Número de tarjeta'), card.numero)
  if (card.titular) await user.type(screen.getByLabelText('Titular de la tarjeta'), card.titular)
  if (card.vencimiento) await user.type(screen.getByLabelText('Vencimiento'), card.vencimiento)
  if (card.cvv) await user.type(screen.getByLabelText('CVV'), card.cvv)
}

describe('validación del formulario de tarjeta (A2, CA3)', () => {
  beforeEach(() => {
    // Solo la fecha: 23 de octubre de 2026
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 23))
    vi.mocked(getAvailableProductById).mockReset()
    vi.mocked(getAvailableProductById).mockResolvedValue(sample)
    vi.mocked(obtenerRecetaAceptada).mockReset()
    vi.mocked(obtenerRecetaAceptada).mockResolvedValue({
      id: 44,
      usuario_id: '11111111-1111-1111-1111-111111111111',
      nombre_archivo: 'receta.pdf',
      tipo: 'receta',
      fecha_carga: '2026-10-22T04:00:00.000Z',
      ubicacion_archivo: '11111111-1111-1111-1111-111111111111/receta/secret.pdf',
      estado_recepcion: 'recibida',
    })
    vi.mocked(createOrder).mockReset()
    vi.mocked(createOrder).mockResolvedValue({
      id: 7,
      numero: 'PED-000007',
      estado: 'pendiente de pago',
    })
    vi.mocked(processPayment).mockReset()
    vi.mocked(processPayment).mockResolvedValue({
      estado: 'aprobado',
      ultimos_digitos: '4242',
    })
    vi.mocked(recordPayment).mockReset()
    vi.mocked(recordPayment).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('con datos inválidos marca los campos, enfoca el primer error y no cobra', async () => {
    const user = await renderCardForm()

    await fillCard(user, { numero: '4242', titular: '' })
    await user.click(screen.getByRole('button', { name: 'Pagar' }))

    const numero = screen.getByLabelText('Número de tarjeta')
    expect(createOrder).not.toHaveBeenCalled()
    expect(processPayment).not.toHaveBeenCalled()
    expect(numero).toHaveAttribute('aria-invalid', 'true')
    expect(numero).toHaveAccessibleDescription(PAYMENT_MESSAGES.numberLength)
    expect(screen.getByLabelText('Titular de la tarjeta')).toHaveAccessibleDescription(
      PAYMENT_MESSAGES.holderRequired,
    )
    expect(screen.getByLabelText('CVV')).not.toHaveAttribute('aria-invalid')
    expect(numero).toHaveFocus()
  })

  it('enfoca el primer campo con error aunque los anteriores estén bien', async () => {
    const user = await renderCardForm()

    await fillCard(user, { vencimiento: '0925' })
    await user.click(screen.getByRole('button', { name: 'Pagar' }))

    expect(processPayment).not.toHaveBeenCalled()
    expect(screen.getByText(PAYMENT_MESSAGES.expiryExpired)).toBeInTheDocument()
    expect(screen.getByLabelText('Vencimiento')).toHaveFocus()
  })

  it('quita el error cuando se corrige el campo', async () => {
    const user = await renderCardForm()

    await fillCard(user, { cvv: '' })
    await user.click(screen.getByRole('button', { name: 'Pagar' }))
    expect(screen.getByText(PAYMENT_MESSAGES.cvvRequired)).toBeInTheDocument()

    await user.type(screen.getByLabelText('CVV'), '123')
    expect(screen.queryByText(PAYMENT_MESSAGES.cvvRequired)).not.toBeInTheDocument()
    expect(screen.getByLabelText('CVV')).not.toHaveAttribute('aria-invalid')
  })

  it('aplica las máscaras al escribir', async () => {
    const user = await renderCardForm()

    await fillCard(user)

    expect(screen.getByLabelText('Número de tarjeta')).toHaveValue('4242 4242 4242 4242')
    expect(screen.getByLabelText('Vencimiento')).toHaveValue('12/28')
    expect(screen.getByLabelText('CVV')).toHaveAttribute('type', 'password')
  })

  it('con datos válidos crea el pedido y cobra una sola vez', async () => {
    const user = await renderCardForm()

    await fillCard(user)
    await user.click(screen.getByRole('button', { name: 'Pagar' }))

    expect(await screen.findByText(PAYMENT_MESSAGES.paid)).toBeInTheDocument()
    expect(createOrder).toHaveBeenCalledWith({
      productId: 1,
      formaPago: 'tarjeta',
      documentoId: 44,
    })
    expect(processPayment).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.pay__error')).toBeNull()
  })

  it('con pago en tienda no valida la tarjeta y borra los datos escritos (A1, RN2)', async () => {
    const user = await renderCardForm()

    await user.type(screen.getByLabelText('Número de tarjeta'), '4242')
    await user.click(screen.getByRole('radio', { name: /Pago en tienda/ }))
    await user.click(screen.getByRole('radio', { name: /Tarjeta de crédito o débito/ }))
    expect(screen.getByLabelText('Número de tarjeta')).toHaveValue('')

    await user.click(screen.getByRole('radio', { name: /Pago en tienda/ }))
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    expect(await screen.findByText(PAYMENT_MESSAGES.storePending)).toBeInTheDocument()
    expect(createOrder).toHaveBeenCalledWith({
      productId: 1,
      formaPago: 'tienda',
      documentoId: 44,
    })
    expect(processPayment).not.toHaveBeenCalled()
    expect(document.querySelector('.pay__error')).toBeNull()
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PAYMENT_MESSAGES } from '../lib/payment/messages'
import { PaymentPage } from '../pages/PaymentPage'

const items = [
  {
    id: 1,
    nombre: 'Montura de prueba',
    precio: 99,
    imagenUrl: '/catalog/ARNETTEAN7225.webp',
  },
]

function renderPage() {
  const onPay = vi.fn()
  const user = userEvent.setup()
  render(<PaymentPage items={items} onPay={onPay} />)
  return { onPay, user }
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
  if (card.titular) await user.type(screen.getByLabelText('Titular'), card.titular)
  if (card.vencimiento) await user.type(screen.getByLabelText('Vencimiento'), card.vencimiento)
  if (card.cvv) await user.type(screen.getByLabelText('CVV'), card.cvv)
}

describe('validación del formulario de tarjeta (A2, CA3)', () => {
  beforeEach(() => {
    // Solo la fecha: 23 de octubre de 2026
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 23))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('con datos inválidos marca los campos, enfoca el primer error y no cobra', async () => {
    const { onPay, user } = renderPage()

    await fillCard(user, { numero: '4242', titular: '' })
    await user.click(screen.getByRole('button', { name: 'Pagar' }))

    const numero = screen.getByLabelText('Número de tarjeta')
    expect(onPay).not.toHaveBeenCalled()
    expect(numero).toHaveAttribute('aria-invalid', 'true')
    expect(numero).toHaveAccessibleDescription(PAYMENT_MESSAGES.numberLength)
    expect(screen.getByLabelText('Titular')).toHaveAccessibleDescription(
      PAYMENT_MESSAGES.holderRequired,
    )
    expect(screen.getByLabelText('CVV')).not.toHaveAttribute('aria-invalid')
    expect(numero).toHaveFocus()
  })

  it('enfoca el primer campo con error aunque los anteriores estén bien', async () => {
    const { onPay, user } = renderPage()

    await fillCard(user, { vencimiento: '0925' })
    await user.click(screen.getByRole('button', { name: 'Pagar' }))

    expect(onPay).not.toHaveBeenCalled()
    expect(screen.getByText(PAYMENT_MESSAGES.expiryExpired)).toBeInTheDocument()
    expect(screen.getByLabelText('Vencimiento')).toHaveFocus()
  })

  it('quita el error cuando se corrige el campo', async () => {
    const { user } = renderPage()

    await fillCard(user, { cvv: '' })
    await user.click(screen.getByRole('button', { name: 'Pagar' }))
    expect(screen.getByText(PAYMENT_MESSAGES.cvvRequired)).toBeInTheDocument()

    await user.type(screen.getByLabelText('CVV'), '123')
    expect(screen.queryByText(PAYMENT_MESSAGES.cvvRequired)).not.toBeInTheDocument()
    expect(screen.getByLabelText('CVV')).not.toHaveAttribute('aria-invalid')
  })

  it('aplica las máscaras al escribir', async () => {
    const { user } = renderPage()

    await fillCard(user)

    expect(screen.getByLabelText('Número de tarjeta')).toHaveValue('4242 4242 4242 4242')
    expect(screen.getByLabelText('Vencimiento')).toHaveValue('12/28')
    expect(screen.getByLabelText('CVV')).toHaveAttribute('type', 'password')
  })

  it('con datos válidos llama a onPay', async () => {
    const { onPay, user } = renderPage()

    await fillCard(user)
    await user.click(screen.getByRole('button', { name: 'Pagar' }))

    expect(onPay).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.payment__error')).toBeNull()
  })

  it('con pago en tienda no valida la tarjeta y borra los datos escritos (A1, RN2)', async () => {
    const { onPay, user } = renderPage()

    await user.type(screen.getByLabelText('Número de tarjeta'), '4242')
    await user.click(screen.getByRole('radio', { name: /Pago en tienda/ }))
    await user.click(screen.getByRole('button', { name: 'Pagar' }))

    expect(onPay).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.payment__error')).toBeNull()

    await user.click(screen.getByRole('radio', { name: /Tarjeta de crédito o débito/ }))
    expect(screen.getByLabelText('Número de tarjeta')).toHaveValue('')
  })
})

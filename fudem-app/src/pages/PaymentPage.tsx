import { useState, type FormEvent } from 'react'
import { CardForm } from '../components/CardForm'
import {
  PaymentMethodSelector,
  type PaymentMethod,
} from '../components/PaymentMethodSelector'
import { useCardForm } from '../lib/payment/useCardForm'
import './PaymentPage.css'

export type ResumenItem = {
  id: number
  nombre: string
  precio: number
  imagenUrl: string
}

export type PaymentMessage = {
  tipo: 'exito' | 'error'
  texto: string
}

export type PaymentPageProps = {
  items: ResumenItem[]
  /** Confirmación o error del pago (lo llenan T5–T9) */
  message?: PaymentMessage | null
  onPay?: () => void
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

/** HU5 / T2: maquetación del resumen del pedido y del formulario de pago. */
export function PaymentPage({ items, message = null, onPay }: PaymentPageProps) {
  // Mostrar u ocultar los campos de tarjeta
  const [method, setMethod] = useState<PaymentMethod>('tarjeta')
  const card = useCardForm()
  const total = items.reduce((sum, item) => sum + item.precio, 0)

  function handleMethodChange(next: PaymentMethod) {
    setMethod(next)
    // RN2: los datos de la tarjeta no se conservan con pago en tienda
    if (next !== 'tarjeta') card.reset()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // T5 (A2, CA3): con datos de tarjeta inválidos no se realiza el cobro
    if (method === 'tarjeta' && !card.validate()) return
    onPay?.()
  }

  return (
    <section className="section payment">
      <div className="row">
        <header className="payment__header">
          <h1>Pago</h1>
          <p>Revisa tu pedido y elige cómo quieres pagar.</p>
        </header>

        <div className="payment__layout">
          <aside className="payment__summary" aria-labelledby="payment-summary-title">
            <h2 id="payment-summary-title" className="payment__block-title">
              Resumen del pedido
            </h2>
            <ul className="payment__items">
              {items.map((item) => (
                <li key={item.id} className="payment__item">
                  <span className="payment__item-thumb">
                    <img src={item.imagenUrl} alt="" />
                  </span>
                  <span className="payment__item-name">{item.nombre}</span>
                  <span className="payment__item-price">
                    {formatPrice(item.precio)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="payment__total">
              <span>Total</span>
              <strong>{formatPrice(total)}</strong>
            </p>
          </aside>

          <form className="payment__form" onSubmit={handleSubmit} noValidate>
            <PaymentMethodSelector selected={method} onChange={handleMethodChange} />

            {method === 'tarjeta' ? <CardForm {...card.formProps} /> : null}

            <button type="submit" className="btn payment__submit">
              Pagar
            </button>

            <div className="payment__message" role="status" aria-live="polite">
              {message ? (
                <p
                  className={
                    message.tipo === 'error'
                      ? 'notice notice--error'
                      : 'notice notice--success'
                  }
                >
                  {message.texto}
                </p>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

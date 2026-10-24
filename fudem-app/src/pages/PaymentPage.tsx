import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CardForm } from '../components/CardForm'
import {
  PaymentMethodSelector,
  type PaymentMethod,
} from '../components/PaymentMethodSelector'
import { catalogImageSrc } from '../lib/catalogImage'
import { formatPrice } from '../lib/payment/format'
import { PAYMENT_MESSAGES } from '../lib/payment/messages'
import {
  ESTADO_PEDIDO,
  ESTADO_PEDIDO_LABEL,
  type PedidoRegistrado,
} from '../lib/payment/orderStatus'
import { isPaymentAlreadyRecorded } from '../lib/payment/paymentErrors'
import { processPayment, type ResultadoPago } from '../lib/payment/paymentGateway'
import { useCardForm } from '../lib/payment/useCardForm'
import { withTimeout } from '../lib/payment/withTimeout'
import {
  obtenerRecetaAceptada,
  type DocumentoCliente,
} from '../services/documentoService'
import { createOrder, recordPayment } from '../services/orderService'
import { getAvailableProductById } from '../services/productService'
import './PaymentPage.css'

export type PaymentPageProps = {
  /** Viene de la ruta /pago#<id> (T10) */
  productId: number | null
}

type ResumenProducto = {
  id: number
  nombre: string
  precio: number
  imagenUrl: string
}

type ProductState =
  | { status: 'loading' | 'notSelected' | 'missing' | 'noPrice' | 'error' }
  | { status: 'ready'; product: ResumenProducto }

type RecetaState =
  | { status: 'loading' | 'missing' | 'error' }
  | { status: 'ready'; receta: DocumentoCliente }

type PaymentAlert = {
  text: string
  /** payment: vuelve a cobrar (E3). record: solo vuelve a guardar el pago aprobado. */
  retry?: 'payment' | 'record'
}

type Confirmation = {
  pedido: PedidoRegistrado
  message: string
  ultimosDigitos: string | null
}

type ApprovedPayment = {
  pedido: PedidoRegistrado
  ultimosDigitos: string
}

const PRODUCT_NOTICES = {
  notSelected: PAYMENT_MESSAGES.productNotSelected,
  missing: PAYMENT_MESSAGES.productMissing,
  noPrice: PAYMENT_MESSAGES.productNoPrice,
} as const

/**
 * HU5: pantalla de pago.
 * T4: carga el producto y la forma de pago. T7: registra el pedido y confirma.
 * T8: pago rechazado (E1). T9: cobros duplicados (CA7, RN4) y falla de la pasarela (E3).
 * RN2: los datos de la tarjeta solo viven en memoria; solo se guardan los últimos 4 dígitos.
 */
export function PaymentPage({ productId }: PaymentPageProps) {
  const [productState, setProductState] = useState<ProductState>(() =>
    productId === null ? { status: 'notSelected' } : { status: 'loading' },
  )
  const [recetaState, setRecetaState] = useState<RecetaState>({ status: 'loading' })
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [processing, setProcessing] = useState(false)
  const [alert, setAlert] = useState<PaymentAlert | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const card = useCardForm()

  // Refs: cambian entre envíos sin esperar a un nuevo render (doble clic, CA7)
  const busyRef = useRef(false)
  const orderRef = useRef<PedidoRegistrado | null>(null)
  const approvedRef = useRef<ApprovedPayment | null>(null)

  useEffect(() => {
    if (productId === null) return

    let active = true
    getAvailableProductById(productId)
      .then((product) => {
        if (!active) return
        if (!product) {
          setProductState({ status: 'missing' })
        } else if (product.precio == null || product.precio <= 0) {
          // Sin precio no se puede pagar (RN1)
          setProductState({ status: 'noPrice' })
        } else {
          setProductState({
            status: 'ready',
            product: {
              id: product.id,
              nombre: product.nombre?.trim() || 'Montura',
              precio: product.precio,
              imagenUrl: catalogImageSrc(product.url_imagen),
            },
          })
        }
      })
      .catch((error: unknown) => {
        if (!active) return
        console.error(error)
        setProductState({ status: 'error' })
      })

    obtenerRecetaAceptada()
      .then((receta) => {
        if (!active) return
        setRecetaState(receta ? { status: 'ready', receta } : { status: 'missing' })
      })
      .catch((error: unknown) => {
        if (!active) return
        console.error(error)
        setRecetaState({ status: 'error' })
      })

    return () => {
      active = false
    }
  }, [productId])

  function handleMethodChange(next: PaymentMethod) {
    setMethod(next)
    setAlert(null)
    // Un pedido se registra con una sola forma de pago
    orderRef.current = null
    // RN2: los datos de la tarjeta no se conservan con pago en tienda
    if (next !== 'tarjeta') card.reset()
  }

  async function ensureOrder(
    product: ResumenProducto,
    formaPago: PaymentMethod,
    documentoId: number,
  ): Promise<PedidoRegistrado | null> {
    if (orderRef.current) return orderRef.current
    try {
      orderRef.current = await createOrder({
        productId: product.id,
        formaPago,
        documentoId,
      })
      return orderRef.current
    } catch (error: unknown) {
      console.error(error)
      setAlert({ text: PAYMENT_MESSAGES.orderFailed })
      return null
    }
  }

  async function saveApproved() {
    const approved = approvedRef.current
    if (!approved) return

    try {
      await recordPayment({
        pedidoId: approved.pedido.id,
        estado: 'aprobado',
        ultimosDigitos: approved.ultimosDigitos,
      })
    } catch (error: unknown) {
      if (!isPaymentAlreadyRecorded(error)) {
        console.error(error)
        setAlert({ text: PAYMENT_MESSAGES.recordFailed, retry: 'record' })
        return
      }
    }

    approvedRef.current = null
    orderRef.current = null
    card.reset()
    setAlert(null)
    setConfirmation({
      // RN3: el trigger pasa el pedido a pagado con el pago aprobado
      pedido: { ...approved.pedido, estado: ESTADO_PEDIDO.pagado },
      message: PAYMENT_MESSAGES.paid,
      ultimosDigitos: approved.ultimosDigitos,
    })
  }

  async function payWithCard(product: ResumenProducto, documentoId: number) {
    const pedido = await ensureOrder(product, 'tarjeta', documentoId)
    if (!pedido) return

    let result: ResultadoPago
    try {
      result = await withTimeout(processPayment(card.values, product.precio))
    } catch {
      // E3: no hubo cobro, no se guarda ningún pago
      setAlert({ text: PAYMENT_MESSAGES.serviceUnavailable, retry: 'payment' })
      return
    }

    if (result.estado === 'rechazado') {
      try {
        await recordPayment({
          pedidoId: pedido.id,
          estado: 'rechazado',
          ultimosDigitos: result.ultimos_digitos,
        })
      } catch (error: unknown) {
        // El aviso de E1 se muestra aunque no se haya podido guardar el intento
        console.error(error)
      }
      card.clearSensitive()
      setAlert({ text: PAYMENT_MESSAGES.declined })
      return
    }

    approvedRef.current = { pedido, ultimosDigitos: result.ultimos_digitos }
    await saveApproved()
  }

  async function payInStore(product: ResumenProducto, documentoId: number) {
    const pedido = await ensureOrder(product, 'tienda', documentoId)
    if (!pedido) return

    orderRef.current = null
    setConfirmation({
      pedido,
      message: PAYMENT_MESSAGES.storePending,
      ultimosDigitos: null,
    })
  }

  /** RN4: un solo proceso a la vez; el botón queda deshabilitado mientras tanto. */
  async function runExclusive(task: () => Promise<void>) {
    if (busyRef.current) return
    busyRef.current = true
    setProcessing(true)
    try {
      await task()
    } finally {
      busyRef.current = false
      setProcessing(false)
    }
  }

  function startPayment() {
    if (productState.status !== 'ready' || busyRef.current) return
    if (recetaState.status !== 'ready') {
      setAlert({ text: PAYMENT_MESSAGES.recipeRequired })
      return
    }
    const { product } = productState
    const { receta } = recetaState

    if (!method) {
      setAlert({ text: PAYMENT_MESSAGES.noMethod })
      return
    }
    // A2: con datos de tarjeta inválidos no se crea el pedido ni se cobra
    if (method === 'tarjeta' && !card.validate()) {
      setAlert(null)
      return
    }

    setAlert(null)
    void runExclusive(() =>
      method === 'tarjeta'
        ? payWithCard(product, receta.id)
        : payInStore(product, receta.id),
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startPayment()
  }

  function handleRetry() {
    if (alert?.retry === 'record') {
      setAlert(null)
      void runExclusive(saveApproved)
    } else {
      startPayment()
    }
  }

  const waitingRecord = alert?.retry === 'record'
  let submitLabel = 'Continuar'
  if (method === 'tarjeta') submitLabel = processing ? 'Procesando pago…' : 'Pagar'
  if (method === 'tienda') {
    submitLabel = processing ? 'Registrando pedido…' : 'Confirmar pedido'
  }

  return (
    <section className="section pay">
      <div className="row">
        <nav className="breadcrumb" aria-label="Miga de pan">
          <a href="/catalogo">Inicio</a> / <a href="/catalogo">Catálogo</a> / Pago
        </nav>

        <header className="pay__header">
          <h1>Pago</h1>
          <p>Revisa tu pedido y elige cómo quieres pagar.</p>
        </header>

        {productState.status === 'loading' ? (
          <p role="status">Cargando montura…</p>
        ) : null}

        {productState.status === 'error' ? (
          <p className="notice notice--error" role="alert">
            {PAYMENT_MESSAGES.productLoadFailed}{' '}
            <a href="/catalogo">Volver al catálogo</a>
          </p>
        ) : null}

        {productState.status === 'notSelected' ||
        productState.status === 'missing' ||
        productState.status === 'noPrice' ? (
          <p className="notice" role="status">
            {PRODUCT_NOTICES[productState.status]}{' '}
            <a href="/catalogo">Volver al catálogo</a>
          </p>
        ) : null}

        {productState.status === 'ready' ? (
          <div className="pay__layout">
            <aside className="pay__panel" aria-labelledby="pay-summary-title">
              <h2 id="pay-summary-title" className="pay__title">
                Resumen del pedido
              </h2>
              <div className="pay__summary-item">
                <span className="pay__summary-media">
                  <img src={productState.product.imagenUrl} alt="" />
                </span>
                <p className="pay__summary-name">{productState.product.nombre}</p>
              </div>
              <dl className="pay__summary-rows">
                {recetaState.status === 'ready' ? (
                  <div className="pay__summary-row">
                    <dt>Receta</dt>
                    <dd>{recetaState.receta.nombre_archivo}</dd>
                  </div>
                ) : null}
                <div className="pay__summary-row">
                  <dt>Precio</dt>
                  <dd>{formatPrice(productState.product.precio)}</dd>
                </div>
                <div className="pay__summary-row pay__summary-row--total">
                  <dt>Total</dt>
                  <dd>{formatPrice(productState.product.precio)}</dd>
                </div>
              </dl>
            </aside>

            <div className="pay__column">
              {recetaState.status === 'loading' ? (
                <p role="status">Comprobando receta…</p>
              ) : null}

              {recetaState.status === 'error' ? (
                <p className="notice notice--error" role="alert">
                  {PAYMENT_MESSAGES.recipeLoadFailed}{' '}
                  <a href="/documentos">Ir a recetas</a>
                </p>
              ) : null}

              {recetaState.status === 'missing' ? (
                <p className="notice" role="status">
                  {PAYMENT_MESSAGES.recipeRequired}{' '}
                  <a href="/documentos">Cargar receta</a>
                </p>
              ) : null}

              {confirmation ? (
                <section className="pay__panel" aria-labelledby="pay-confirm-title">
                  <h2 id="pay-confirm-title" className="pay__title">
                    Confirmación
                  </h2>
                  <p className="notice notice--success" role="status">
                    {confirmation.message}
                  </p>
                  <dl className="pay__confirm">
                    <div>
                      <dt>Número de pedido</dt>
                      <dd>{confirmation.pedido.numero}</dd>
                    </div>
                    <div>
                      <dt>Estado</dt>
                      <dd>{ESTADO_PEDIDO_LABEL[confirmation.pedido.estado]}</dd>
                    </div>
                    {recetaState.status === 'ready' ? (
                      <div>
                        <dt>Receta</dt>
                        <dd>{recetaState.receta.nombre_archivo}</dd>
                      </div>
                    ) : null}
                    {confirmation.ultimosDigitos ? (
                      <div>
                        <dt>Tarjeta</dt>
                        <dd>Terminada en {confirmation.ultimosDigitos}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <a className="btn" href="/catalogo">
                    Volver al catálogo
                  </a>
                </section>
              ) : recetaState.status === 'ready' ? (
                <form className="pay__panel" onSubmit={handleSubmit} noValidate>
                  <PaymentMethodSelector
                    selected={method}
                    onChange={handleMethodChange}
                    disabled={processing || waitingRecord}
                  />

                  {method === 'tarjeta' ? <CardForm {...card.formProps} /> : null}

                  {alert ? (
                    <div className="notice notice--error pay__alert" role="alert">
                      <p>{alert.text}</p>
                      {alert.retry ? (
                        <button
                          type="button"
                          className="btn btn--outline"
                          onClick={handleRetry}
                          disabled={processing}
                        >
                          Reintentar
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    className="btn pay__submit"
                    disabled={processing || waitingRecord}
                  >
                    {submitLabel}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

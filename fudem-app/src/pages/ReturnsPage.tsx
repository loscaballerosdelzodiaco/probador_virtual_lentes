import { useMemo, useRef, useState, type FormEvent } from 'react'
import './ReturnsPage.css'
import { ReturnStatusList } from '../components/ReturnStatusList'
import { useDeliveredOrders } from '../hooks/useDeliveredOrders'
import { useMyReturns } from '../hooks/useMyReturns'
import { RETURN_MESSAGES } from '../lib/returns/messages'
import {
  ESTADO_DEVOLUCION_LABEL,
  FORMA_DEVOLUCION,
  FORMA_DEVOLUCION_LABEL,
  MSG_NO_ORDERS,
  RETURN_CONDITIONS_TEXT,
  RETURN_REASONS,
  RETURN_WINDOW_DAYS,
  evaluateEligibility,
  returnSubmitMessage,
  type FormaDevolucion,
  type ReturnReason,
} from '../lib/returns/returnRules'
import {
  hasReturnErrors,
  validateReturnForm,
  type ReturnErrors,
  type ReturnField,
} from '../lib/returns/validateReturn'
import { createDevolucion, type Devolucion } from '../services/returnService'

type Tab = 'solicitar' | 'estado'

function formatDate(iso: string | null) {
  if (!iso) return 'Sin fecha'
  return new Date(iso).toLocaleDateString('es-SV', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(value)
}

const FIELD_ERROR_ID: Record<ReturnField, string> = {
  motivo: 'devolucion-motivo-error',
  forma: 'devolucion-forma-error',
  condicionesConfirmadas: 'devolucion-condiciones-error',
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="returns__error" role="alert">
      {message}
    </p>
  )
}

export function ReturnsPage() {
  // T3: pedidos entregados del cliente.
  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
    reload: reloadOrders,
  } = useDeliveredOrders()

  // T6: solicitudes del cliente y su estado (también sirven para validar A2).
  const {
    returns,
    loading: returnsLoading,
    refreshing: returnsRefreshing,
    error: returnsError,
    refreshError: returnsRefreshError,
    reload: reloadReturns,
    addReturn,
  } = useMyReturns()

  const isLoading = ordersLoading || returnsLoading
  const loadError = ordersError ?? returnsError

  const [tab, setTab] = useState<Tab>('solicitar')

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [motivo, setMotivo] = useState<ReturnReason | ''>('')
  const [forma, setForma] = useState<FormaDevolucion | ''>('')
  const [comentarios, setComentarios] = useState('')
  const [confirmaCondiciones, setConfirmaCondiciones] = useState(false)
  const [formErrors, setFormErrors] = useState<ReturnErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastCreated, setLastCreated] = useState<Devolucion | null>(null)

  // Evita un segundo envío antes de que React deshabilite el botón.
  const submittingRef = useRef(false)
  const motivoRef = useRef<HTMLSelectElement>(null)
  const formaRef = useRef<HTMLInputElement>(null)
  const condicionesRef = useRef<HTMLInputElement>(null)

  function handleRetry() {
    if (ordersError) reloadOrders()
    if (returnsError) reloadReturns()
  }

  const eligibilityByOrder = useMemo(
    () => new Map(orders.map((order) => [order.id, evaluateEligibility(order, returns)])),
    [orders, returns],
  )

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null
  const eligibility = selectedOrder ? (eligibilityByOrder.get(selectedOrder.id) ?? null) : null

  function resetForm() {
    setMotivo('')
    setForma('')
    setComentarios('')
    setConfirmaCondiciones(false)
    setFormErrors({})
    setSubmitError(null)
  }

  function clearFieldError(field: ReturnField) {
    setFormErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function focusFirstError(errors: ReturnErrors) {
    if (errors.motivo) motivoRef.current?.focus()
    else if (errors.forma) formaRef.current?.focus()
    else if (errors.condicionesConfirmadas) condicionesRef.current?.focus()
  }

  function handleSelectOrder(orderId: number) {
    setSelectedOrderId(orderId)
    setLastCreated(null)
    resetForm()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current || !selectedOrder || eligibility?.eligible !== true) return

    const errors = validateReturnForm({
      motivo,
      forma,
      condicionesConfirmadas: confirmaCondiciones,
    })
    setFormErrors(errors)
    if (hasReturnErrors(errors) || !motivo || !forma) {
      focusFirstError(errors)
      return
    }

    submittingRef.current = true
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const created = await createDevolucion({
        pedidoId: selectedOrder.id,
        motivo,
        forma,
        comentarios,
      })
      addReturn(created)
      setLastCreated(created)
      setSelectedOrderId(null)
      resetForm()
    } catch (error: unknown) {
      console.error(error)
      const message = returnSubmitMessage(error)
      setSubmitError(message)
      // A2 desde la base: hay una solicitud que la pantalla no tenía; se recarga
      // la lista para que el pedido quede marcado.
      if (message === RETURN_MESSAGES.alreadyRequested) {
        reloadReturns()
      }
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <section id="devoluciones" className="section">
      <div className="row returns">
        <nav className="breadcrumb" aria-label="Miga de pan">
          <a href="/catalogo">Inicio</a> / Devoluciones
        </nav>

        <h1>Devolución de lentes</h1>
        <p>
          Solicita la devolución de tus lentes entregados y consulta el estado de tus
          solicitudes.
        </p>

        {isLoading ? <p role="status">Cargando tus pedidos…</p> : null}

        {!isLoading && loadError ? (
          <div className="notice notice--error returns__load-error" role="alert">
            <p>{loadError}</p>
            <button type="button" className="btn btn--outline" onClick={handleRetry}>
              Reintentar
            </button>
          </div>
        ) : null}

        {!isLoading && !loadError ? (
          <>
            <div className="catalog-filters" role="tablist" aria-label="Devoluciones">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'solicitar'}
                className={tab === 'solicitar' ? 'btn--filter is-active' : 'btn--filter'}
                onClick={() => setTab('solicitar')}
              >
                Solicitar devolución
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'estado'}
                className={tab === 'estado' ? 'btn--filter is-active' : 'btn--filter'}
                onClick={() => setTab('estado')}
              >
                Mis solicitudes ({returns.length})
              </button>
            </div>

            {tab === 'solicitar' ? (
              <>
                {lastCreated ? (
                  <div className="notice notice--success returns__success" role="status">
                    <p>
                      <strong>Solicitud registrada.</strong> Estado actual:{' '}
                      <span className="returns__badge">
                        {ESTADO_DEVOLUCION_LABEL[lastCreated.estado]}
                      </span>
                    </p>
                    <button
                      type="button"
                      className="btn btn--link"
                      onClick={() => setTab('estado')}
                    >
                      Ver mis solicitudes
                    </button>
                  </div>
                ) : null}

                {orders.length === 0 ? (
                  <p className="notice" role="status">
                    {MSG_NO_ORDERS}
                  </p>
                ) : (
                  <>
                    <h2>1. Selecciona el pedido</h2>
                    <ul className="returns__orders">
                      {orders.map((order) => {
                        const check = eligibilityByOrder.get(order.id)
                        const selected = order.id === selectedOrderId
                        return (
                          <li key={order.id}>
                            <label
                              className={
                                selected ? 'returns__order is-selected' : 'returns__order'
                              }
                            >
                              <input
                                type="radio"
                                name="pedido"
                                value={order.id}
                                checked={selected}
                                onChange={() => handleSelectOrder(order.id)}
                              />
                              <span className="returns__order-info">
                                <strong>
                                  {order.numero} · {order.productoNombre}
                                </strong>
                                <br />
                                Entregado el {formatDate(order.fechaEntrega)} ·{' '}
                                {formatMoney(order.monto)}
                              </span>
                              {check && !check.eligible ? (
                                <span className="returns__badge returns__badge--muted">
                                  {check.message}
                                </span>
                              ) : null}
                            </label>
                          </li>
                        )
                      })}
                    </ul>

                    {selectedOrder && eligibility && !eligibility.eligible ? (
                      <div className="notice notice--error" role="alert">
                        <p>{eligibility.message}</p>
                        {eligibility.detail ? <p>{eligibility.detail}</p> : null}
                      </div>
                    ) : null}

                    {selectedOrder && eligibility?.eligible ? (
                      <form className="returns__form" onSubmit={handleSubmit} noValidate>
                        <h2>2. Cuéntanos sobre tu devolución</h2>
                        <p className="returns__hint">
                          Puedes solicitarla hasta el{' '}
                          {formatDate(eligibility.deadline.toISOString())} ({RETURN_WINDOW_DAYS}{' '}
                          días posteriores a la entrega).
                        </p>

                        <label htmlFor="devolucion-motivo">Motivo de la devolución</label>
                        <select
                          id="devolucion-motivo"
                          ref={motivoRef}
                          value={motivo}
                          aria-invalid={Boolean(formErrors.motivo)}
                          aria-describedby={
                            formErrors.motivo ? FIELD_ERROR_ID.motivo : undefined
                          }
                          onChange={(event) => {
                            setMotivo(event.target.value as ReturnReason | '')
                            clearFieldError('motivo')
                          }}
                        >
                          <option value="">Selecciona un motivo</option>
                          {RETURN_REASONS.map((reason) => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                        </select>
                        <FieldError id={FIELD_ERROR_ID.motivo} message={formErrors.motivo} />

                        <fieldset
                          className="returns__fieldset"
                          aria-describedby={
                            formErrors.forma ? FIELD_ERROR_ID.forma : undefined
                          }
                        >
                          <legend>Forma de devolución</legend>
                          {Object.values(FORMA_DEVOLUCION).map((value, index) => (
                            <label key={value} className="returns__radio">
                              <input
                                type="radio"
                                name="forma"
                                value={value}
                                ref={index === 0 ? formaRef : undefined}
                                checked={forma === value}
                                aria-invalid={Boolean(formErrors.forma)}
                                onChange={() => {
                                  setForma(value)
                                  clearFieldError('forma')
                                }}
                              />
                              {FORMA_DEVOLUCION_LABEL[value]}
                            </label>
                          ))}
                          <FieldError id={FIELD_ERROR_ID.forma} message={formErrors.forma} />
                        </fieldset>

                        <label htmlFor="devolucion-comentarios">Comentarios (opcional)</label>
                        <textarea
                          id="devolucion-comentarios"
                          rows={3}
                          maxLength={500}
                          value={comentarios}
                          onChange={(event) => setComentarios(event.target.value)}
                        />

                        <label className="returns__radio">
                          <input
                            type="checkbox"
                            ref={condicionesRef}
                            checked={confirmaCondiciones}
                            aria-invalid={Boolean(formErrors.condicionesConfirmadas)}
                            aria-describedby={
                              formErrors.condicionesConfirmadas
                                ? FIELD_ERROR_ID.condicionesConfirmadas
                                : undefined
                            }
                            onChange={(event) => {
                              setConfirmaCondiciones(event.target.checked)
                              clearFieldError('condicionesConfirmadas')
                            }}
                          />
                          <span>
                            {RETURN_CONDITIONS_TEXT} Confirmo que cumplen esta condición.
                          </span>
                        </label>
                        <FieldError
                          id={FIELD_ERROR_ID.condicionesConfirmadas}
                          message={formErrors.condicionesConfirmadas}
                        />

                        {submitError ? (
                          <p className="notice notice--error" role="alert">
                            {submitError}
                          </p>
                        ) : null}

                        <button type="submit" className="btn" disabled={isSubmitting}>
                          {isSubmitting ? 'Enviando…' : 'Solicitar devolución'}
                        </button>
                      </form>
                    ) : null}
                  </>
                )}
              </>
            ) : (
              <ReturnStatusList
                returns={returns}
                refreshing={returnsRefreshing}
                refreshError={returnsRefreshError}
                onRefresh={reloadReturns}
                onNewRequest={() => setTab('solicitar')}
              />
            )}
          </>
        ) : null}
      </div>
    </section>
  )
}

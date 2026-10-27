import type { EntregaPedido } from '../lib/payment/orderStatus'
import { PEDIDO_ENTREGA_LOAD_ERROR_MESSAGE } from '../services/orderService'

export type DeliverySummaryProps = {
  entrega: EntregaPedido | null
  pedidoNumero?: string | null
  loading?: boolean
  error?: string | null
}

/**
 * HU6: resumen de la entrega ya guardada en el pedido.
 */
export function DeliverySummary({
  entrega,
  pedidoNumero,
  loading = false,
  error = null,
}: DeliverySummaryProps) {
  if (loading) {
    return (
      <section className="delivery__panel" aria-labelledby="entrega-resumen-title">
        <h2 id="entrega-resumen-title" className="delivery__title">
          Resumen de entrega
        </h2>
        <p role="status">Cargando resumen de entrega…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="delivery__panel" aria-labelledby="entrega-resumen-title">
        <h2 id="entrega-resumen-title" className="delivery__title">
          Resumen de entrega
        </h2>
        <p className="notice notice--error" role="alert">
          {error || PEDIDO_ENTREGA_LOAD_ERROR_MESSAGE}
        </p>
      </section>
    )
  }

  return (
    <section className="delivery__panel" aria-labelledby="entrega-resumen-title">
      <h2 id="entrega-resumen-title" className="delivery__title">
        Resumen de entrega
      </h2>
      {pedidoNumero ? (
        <p className="delivery__empty">Pedido {pedidoNumero}</p>
      ) : null}
      {entrega ? (
        <dl className="delivery__summary-rows">
          <div className="delivery__summary-row">
            <dt>Forma</dt>
            <dd>{entrega.tipo === 'domicilio' ? 'Envío a domicilio' : 'Retiro en sucursal'}</dd>
          </div>
          {entrega.tipo === 'domicilio' ? (
            <>
              <div className="delivery__summary-row">
                <dt>Departamento</dt>
                <dd>{entrega.departamento}</dd>
              </div>
              <div className="delivery__summary-row">
                <dt>Municipio</dt>
                <dd>{entrega.municipio}</dd>
              </div>
              <div className="delivery__summary-row">
                <dt>Dirección</dt>
                <dd>{entrega.direccion}</dd>
              </div>
              <div className="delivery__summary-row">
                <dt>Teléfono</dt>
                <dd>{entrega.telefono}</dd>
              </div>
            </>
          ) : (
            <>
              <div className="delivery__summary-row">
                <dt>Sucursal</dt>
                <dd>{entrega.sucursalNombre}</dd>
              </div>
              <div className="delivery__summary-row">
                <dt>Dirección</dt>
                <dd>{entrega.sucursalDireccion}</dd>
              </div>
            </>
          )}
        </dl>
      ) : (
        <p className="delivery__empty">
          Confirma una forma de entrega para ver el resumen aquí.
        </p>
      )}
    </section>
  )
}

import { FORMA_DEVOLUCION_LABEL } from '../lib/returns/returnRules'
import { returnStatusInfo } from '../lib/returns/returnStatus'
import type { Devolucion } from '../services/returnService'

type ReturnStatusListProps = {
  returns: Devolucion[]
  refreshing: boolean
  /** Mensaje si la última actualización falló (la lista mostrada es la anterior). */
  refreshError: string | null
  onRefresh: () => void
  onNewRequest: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-SV', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/** CA5: solicitudes de devolución del cliente con su estado. */
export function ReturnStatusList({
  returns,
  refreshing,
  refreshError,
  onRefresh,
  onNewRequest,
}: ReturnStatusListProps) {
  return (
    <>
      <div className="returns__status-head">
        <h2>Mis solicitudes de devolución</h2>
        <button
          type="button"
          className="btn btn--outline"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Actualizando…' : 'Actualizar estado'}
        </button>
      </div>

      {refreshError ? (
        <p className="notice notice--error" role="alert">
          {refreshError}
        </p>
      ) : null}

      {returns.length === 0 ? (
        <div className="notice" role="status">
          <p>Aún no has solicitado devoluciones.</p>
          <button type="button" className="btn btn--link" onClick={onNewRequest}>
            Solicitar una devolución
          </button>
        </div>
      ) : (
        <ul className="returns__list" aria-label="Solicitudes de devolución">
          {returns.map((item) => {
            const status = returnStatusInfo(item.estado)
            return (
              <li key={item.id} className="returns__item">
                <div className="returns__item-head">
                  <strong>
                    {item.numeroPedido} · {item.productoNombre}
                  </strong>
                  <span className={`returns__badge returns__badge--${status.tone}`}>
                    {status.label}
                  </span>
                </div>
                <p className="returns__status-text">{status.description}</p>
                <p>Solicitada el {formatDate(item.fechaSolicitud)}</p>
                <p>Motivo: {item.motivo}</p>
                <p>Forma: {FORMA_DEVOLUCION_LABEL[item.forma] ?? item.forma}</p>
                {item.comentarios ? <p>Comentarios: {item.comentarios}</p> : null}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

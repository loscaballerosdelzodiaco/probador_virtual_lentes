import { useMemo, useState, type FormEvent } from 'react'
import type {
  DeliveryMethod,
  DeliverySelection,
  DepartamentoOption,
  MunicipioOption,
  SucursalOption,
} from '../lib/delivery/types'
import './DeliveryPage.css'

export type {
  DeliveryMethod,
  DeliverySelection,
  DepartamentoOption,
  MunicipioOption,
  SucursalOption,
} from '../lib/delivery/types'

export type DeliveryOptionsPageProps = {
  departamentos?: DepartamentoOption[]
  municipios?: MunicipioOption[]
  sucursales?: SucursalOption[]
  onConfirm?: (selection: DeliverySelection) => void
}

const NO_BRANCHES_MESSAGE = 'No hay sucursales disponibles para retiro'

function sucursalesActivas(sucursales: SucursalOption[]): SucursalOption[] {
  return sucursales.filter((sucursal) => sucursal.activa !== false)
}

function etiquetaDe(
  items: Array<{ id: string; nombre: string }>,
  id: string,
): string {
  return items.find((item) => item.id === id)?.nombre ?? id
}

/**
 * HU6: forma de entrega. La UI cambia según la opción elegida.
 * Las listas y el guardado se inyectan por props; este componente no los carga.
 */
export function DeliveryOptionsPage({
  departamentos = [],
  municipios = [],
  sucursales = [],
  onConfirm,
}: DeliveryOptionsPageProps) {
  const activas = useMemo(() => sucursalesActivas(sucursales), [sucursales])
  const puedeRetirar = activas.length > 0

  const [method, setMethod] = useState<DeliveryMethod | null>(null)
  const [departamentoId, setDepartamentoId] = useState('')
  const [municipioId, setMunicipioId] = useState('')
  const [direccion, setDireccion] = useState('')
  const [telefono, setTelefono] = useState('')
  const [sucursalId, setSucursalId] = useState('')
  const [resumen, setResumen] = useState<DeliverySelection | null>(null)
  const methodEfectivo: DeliveryMethod | null = puedeRetirar ? method : 'domicilio'

  const municipiosDelDepartamento = useMemo(
    () => municipios.filter((municipio) => municipio.departamentoId === departamentoId),
    [departamentoId, municipios],
  )

  function handleMethodChange(next: DeliveryMethod) {
    if (next === 'sucursal' && !puedeRetirar) return
    setMethod(next)
    setResumen(null)
  }

  function handleDepartamentoChange(next: string) {
    setDepartamentoId(next)
    setMunicipioId('')
    setResumen(null)
  }

  function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!methodEfectivo) return

    const selection: DeliverySelection =
      methodEfectivo === 'domicilio'
        ? {
            method: 'domicilio',
            departamentoId,
            municipioId,
            direccion,
            telefono,
          }
        : {
            method: 'sucursal',
            sucursalId,
          }

    setResumen(selection)
    onConfirm?.(selection)
  }

  return (
    <section className="section delivery">
      <div className="row">
        <nav className="breadcrumb" aria-label="Miga de pan">
          <a href="/catalogo">Inicio</a> / Entrega
        </nav>

        <header className="delivery__header">
          <h1>Forma de entrega</h1>
          <p>Elige si recibes tus lentes en casa o los retiras en una sucursal.</p>
        </header>

        <div className="delivery__layout">
          <form className="delivery__panel" onSubmit={handleConfirm} noValidate>
            <fieldset className="delivery__methods">
              <legend>Opciones de entrega</legend>
              <label
                className={
                  methodEfectivo === 'domicilio'
                    ? 'delivery__method is-selected'
                    : 'delivery__method'
                }
              >
                <input
                  type="radio"
                  name="forma-entrega"
                  value="domicilio"
                  checked={methodEfectivo === 'domicilio'}
                  onChange={() => handleMethodChange('domicilio')}
                />
                <span>
                  Envío a domicilio
                  <small>Indicamos departamento, municipio y dirección.</small>
                </span>
              </label>
              <label
                className={
                  methodEfectivo === 'sucursal'
                    ? 'delivery__method is-selected'
                    : puedeRetirar
                      ? 'delivery__method'
                      : 'delivery__method is-disabled'
                }
              >
                <input
                  type="radio"
                  name="forma-entrega"
                  value="sucursal"
                  checked={methodEfectivo === 'sucursal'}
                  disabled={!puedeRetirar}
                  onChange={() => handleMethodChange('sucursal')}
                />
                <span>
                  Retiro en sucursal
                  <small>
                    {puedeRetirar
                      ? 'Eliges la sucursal donde recogerás el pedido.'
                      : NO_BRANCHES_MESSAGE}
                  </small>
                </span>
              </label>
            </fieldset>

            {!puedeRetirar ? (
              <p className="notice delivery__notice" role="status">
                {NO_BRANCHES_MESSAGE}
              </p>
            ) : null}

            {methodEfectivo === 'domicilio' ? (
              <div className="delivery__fields">
                <div className="delivery__field">
                  <label htmlFor="entrega-departamento">Departamento</label>
                  <select
                    id="entrega-departamento"
                    name="departamento"
                    value={departamentoId}
                    onChange={(event) => handleDepartamentoChange(event.target.value)}
                  >
                    <option value="">Selecciona un departamento</option>
                    {departamentos.map((departamento) => (
                      <option key={departamento.id} value={departamento.id}>
                        {departamento.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="delivery__field">
                  <label htmlFor="entrega-municipio">Municipio</label>
                  <select
                    id="entrega-municipio"
                    name="municipio"
                    value={municipioId}
                    disabled={!departamentoId}
                    onChange={(event) => {
                      setMunicipioId(event.target.value)
                      setResumen(null)
                    }}
                  >
                    <option value="">
                      {departamentoId
                        ? 'Selecciona un municipio'
                        : 'Primero elige un departamento'}
                    </option>
                    {municipiosDelDepartamento.map((municipio) => (
                      <option key={municipio.id} value={municipio.id}>
                        {municipio.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="delivery__field">
                  <label htmlFor="entrega-direccion">Dirección de entrega</label>
                  <textarea
                    id="entrega-direccion"
                    name="direccion"
                    value={direccion}
                    onChange={(event) => {
                      setDireccion(event.target.value)
                      setResumen(null)
                    }}
                  />
                </div>
                <div className="delivery__field">
                  <label htmlFor="entrega-telefono">Teléfono de contacto</label>
                  <input
                    id="entrega-telefono"
                    name="telefono"
                    type="text"
                    inputMode="tel"
                    autoComplete="tel"
                    value={telefono}
                    onChange={(event) => {
                      setTelefono(event.target.value)
                      setResumen(null)
                    }}
                  />
                </div>
              </div>
            ) : null}

            {methodEfectivo === 'sucursal' && puedeRetirar ? (
              <div className="delivery__fields">
                <div className="delivery__field">
                  <label htmlFor="entrega-sucursal">Sucursal</label>
                  <select
                    id="entrega-sucursal"
                    name="sucursal"
                    value={sucursalId}
                    onChange={(event) => {
                      setSucursalId(event.target.value)
                      setResumen(null)
                    }}
                  >
                    <option value="">Selecciona una sucursal</option>
                    {activas.map((sucursal) => (
                      <option key={sucursal.id} value={sucursal.id}>
                        {sucursal.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}

            <button className="btn delivery__submit" type="submit" disabled={!methodEfectivo}>
              Confirmar
            </button>
          </form>

          <aside className="delivery__panel" aria-labelledby="entrega-resumen-title">
            <h2 id="entrega-resumen-title" className="delivery__title">
              Resumen de entrega
            </h2>
            {resumen ? (
              <dl className="delivery__summary-rows">
                <div className="delivery__summary-row">
                  <dt>Forma</dt>
                  <dd>
                    {resumen.method === 'domicilio'
                      ? 'Envío a domicilio'
                      : 'Retiro en sucursal'}
                  </dd>
                </div>
                {resumen.method === 'domicilio' ? (
                  <>
                    <div className="delivery__summary-row">
                      <dt>Departamento</dt>
                      <dd>{etiquetaDe(departamentos, resumen.departamentoId) || '—'}</dd>
                    </div>
                    <div className="delivery__summary-row">
                      <dt>Municipio</dt>
                      <dd>{etiquetaDe(municipios, resumen.municipioId) || '—'}</dd>
                    </div>
                    <div className="delivery__summary-row">
                      <dt>Dirección</dt>
                      <dd>{resumen.direccion.trim() || '—'}</dd>
                    </div>
                    <div className="delivery__summary-row">
                      <dt>Teléfono</dt>
                      <dd>{resumen.telefono.trim() || '—'}</dd>
                    </div>
                  </>
                ) : (
                  <div className="delivery__summary-row">
                    <dt>Sucursal</dt>
                    <dd>{etiquetaDe(activas, resumen.sucursalId) || '—'}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="delivery__empty">
                Confirma una forma de entrega para ver el resumen aquí.
              </p>
            )}
          </aside>
        </div>
      </div>
    </section>
  )
}

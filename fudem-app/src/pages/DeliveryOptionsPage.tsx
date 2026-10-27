import { useMemo, useState, type FormEvent } from 'react'
import { DeliverySummary } from '../components/DeliverySummary'
import type {
  DeliveryMethod,
  DeliverySelection,
  DepartamentoOption,
  MunicipioOption,
  SucursalOption,
} from '../lib/delivery/types'
import type { EntregaPedido } from '../lib/payment/orderStatus'
import {
  DELIVERY_NO_BRANCHES_MESSAGE,
  DELIVERY_SAVE_ERROR_MESSAGE,
  hasDeliveryErrors,
  validateDelivery,
  type DeliveryErrors,
} from '../lib/delivery/validateDelivery'
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
  savedEntrega?: EntregaPedido | null
  pedidoNumero?: string | null
  summaryLoading?: boolean
  summaryError?: string | null
  onConfirm?: (selection: DeliverySelection) => void | Promise<void>
}

function sucursalesActivas(sucursales: SucursalOption[]): SucursalOption[] {
  return sucursales.filter((sucursal) => sucursal.activa !== false)
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="delivery__error" role="alert">
      {message}
    </p>
  )
}

/**
 * HU6: forma de entrega. Las listas y el guardado se inyectan por props.
 */
export function DeliveryOptionsPage({
  departamentos = [],
  municipios = [],
  sucursales = [],
  savedEntrega = null,
  pedidoNumero = null,
  summaryLoading = false,
  summaryError = null,
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
  const [fieldErrors, setFieldErrors] = useState<DeliveryErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const methodEfectivo: DeliveryMethod | null = puedeRetirar ? method : 'domicilio'
  const formData = {
    method: methodEfectivo,
    departamentoId,
    municipioId,
    direccion,
    telefono,
    sucursalId,
  }
  const liveErrors = validateDelivery(formData)
  const locked = Boolean(savedEntrega)
  const canConfirm = !locked && !hasDeliveryErrors(liveErrors) && !saving

  const municipiosDelDepartamento = useMemo(
    () => municipios.filter((municipio) => municipio.departamentoId === departamentoId),
    [departamentoId, municipios],
  )

  function clearFieldError(field: keyof DeliveryErrors) {
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function handleMethodChange(next: DeliveryMethod) {
    if (next === 'sucursal' && !puedeRetirar) return
    setMethod(next)
    setFieldErrors({})
    setSaveError(null)
  }

  function handleDepartamentoChange(next: string) {
    setDepartamentoId(next)
    setMunicipioId('')
    clearFieldError('departamentoId')
    clearFieldError('municipioId')
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validateDelivery(formData)
    setFieldErrors(errors)
    setSaveError(null)
    if (hasDeliveryErrors(errors) || !methodEfectivo || saving || locked) return

    const selection: DeliverySelection =
      methodEfectivo === 'domicilio'
        ? {
            method: 'domicilio',
            departamentoId,
            municipioId,
            direccion: direccion.trim(),
            telefono: telefono.trim(),
          }
        : {
            method: 'sucursal',
            sucursalId,
          }

    if (!onConfirm) return

    setSaving(true)
    try {
      await onConfirm(selection)
    } catch (cause: unknown) {
      console.error(cause)
      setSaveError(DELIVERY_SAVE_ERROR_MESSAGE)
    } finally {
      setSaving(false)
    }
  }

  const shownErrors = { ...liveErrors, ...fieldErrors }

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
          {locked ? (
            <p className="notice" role="status">
              La forma de entrega de este pedido ya está confirmada y no se puede modificar.
            </p>
          ) : (
          <form className="delivery__panel" onSubmit={(event) => void handleConfirm(event)} noValidate>
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
                      : DELIVERY_NO_BRANCHES_MESSAGE}
                  </small>
                </span>
              </label>
            </fieldset>
            <FieldError id="entrega-method-error" message={shownErrors.method} />

            {!puedeRetirar ? (
              <p className="notice delivery__notice" role="status">
                {DELIVERY_NO_BRANCHES_MESSAGE}
              </p>
            ) : null}

            {methodEfectivo === 'domicilio' ? (
              <div className="delivery__fields">
                <div
                  className={
                    shownErrors.departamentoId
                      ? 'delivery__field delivery__field--invalid'
                      : 'delivery__field'
                  }
                >
                  <label htmlFor="entrega-departamento">Departamento</label>
                  <select
                    id="entrega-departamento"
                    name="departamento"
                    value={departamentoId}
                    aria-invalid={Boolean(shownErrors.departamentoId)}
                    aria-errormessage={
                      shownErrors.departamentoId ? 'entrega-departamento-error' : undefined
                    }
                    onChange={(event) => handleDepartamentoChange(event.target.value)}
                  >
                    <option value="">Selecciona un departamento</option>
                    {departamentos.map((departamento) => (
                      <option key={departamento.id} value={departamento.id}>
                        {departamento.nombre}
                      </option>
                    ))}
                  </select>
                  <FieldError
                    id="entrega-departamento-error"
                    message={shownErrors.departamentoId}
                  />
                </div>
                <div
                  className={
                    shownErrors.municipioId
                      ? 'delivery__field delivery__field--invalid'
                      : 'delivery__field'
                  }
                >
                  <label htmlFor="entrega-municipio">Municipio</label>
                  <select
                    id="entrega-municipio"
                    name="municipio"
                    value={municipioId}
                    disabled={!departamentoId}
                    aria-invalid={Boolean(shownErrors.municipioId)}
                    aria-errormessage={
                      shownErrors.municipioId ? 'entrega-municipio-error' : undefined
                    }
                    onChange={(event) => {
                      setMunicipioId(event.target.value)
                      clearFieldError('municipioId')
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
                  <FieldError id="entrega-municipio-error" message={shownErrors.municipioId} />
                </div>
                <div
                  className={
                    shownErrors.direccion
                      ? 'delivery__field delivery__field--invalid'
                      : 'delivery__field'
                  }
                >
                  <label htmlFor="entrega-direccion">Dirección de entrega</label>
                  <textarea
                    id="entrega-direccion"
                    name="direccion"
                    value={direccion}
                    aria-invalid={Boolean(shownErrors.direccion)}
                    aria-errormessage={
                      shownErrors.direccion ? 'entrega-direccion-error' : undefined
                    }
                    onChange={(event) => {
                      setDireccion(event.target.value)
                      clearFieldError('direccion')
                    }}
                  />
                  <FieldError id="entrega-direccion-error" message={shownErrors.direccion} />
                </div>
                <div
                  className={
                    shownErrors.telefono
                      ? 'delivery__field delivery__field--invalid'
                      : 'delivery__field'
                  }
                >
                  <label htmlFor="entrega-telefono">Teléfono de contacto</label>
                  <input
                    id="entrega-telefono"
                    name="telefono"
                    type="text"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={telefono}
                    aria-invalid={Boolean(shownErrors.telefono)}
                    aria-errormessage={
                      shownErrors.telefono ? 'entrega-telefono-error' : undefined
                    }
                    onChange={(event) => {
                      setTelefono(event.target.value)
                      clearFieldError('telefono')
                    }}
                  />
                  <FieldError id="entrega-telefono-error" message={shownErrors.telefono} />
                </div>
              </div>
            ) : null}

            {methodEfectivo === 'sucursal' && puedeRetirar ? (
              <div className="delivery__fields">
                <div
                  className={
                    shownErrors.sucursalId
                      ? 'delivery__field delivery__field--invalid'
                      : 'delivery__field'
                  }
                >
                  <label htmlFor="entrega-sucursal">Sucursal</label>
                  <select
                    id="entrega-sucursal"
                    name="sucursal"
                    value={sucursalId}
                    aria-invalid={Boolean(shownErrors.sucursalId)}
                    aria-errormessage={
                      shownErrors.sucursalId ? 'entrega-sucursal-error' : undefined
                    }
                    onChange={(event) => {
                      setSucursalId(event.target.value)
                      clearFieldError('sucursalId')
                    }}
                  >
                    <option value="">Selecciona una sucursal</option>
                    {activas.map((sucursal) => (
                      <option key={sucursal.id} value={sucursal.id}>
                        {sucursal.nombre}
                      </option>
                    ))}
                  </select>
                  <FieldError id="entrega-sucursal-error" message={shownErrors.sucursalId} />
                </div>
              </div>
            ) : null}

            {saveError ? (
              <p className="notice notice--error delivery__notice" role="alert">
                {saveError}
              </p>
            ) : null}

            <button className="btn delivery__submit" type="submit" disabled={!canConfirm}>
              {saving ? 'Guardando…' : 'Confirmar'}
            </button>
          </form>
          )}

          <DeliverySummary
            entrega={savedEntrega}
            pedidoNumero={pedidoNumero}
            loading={summaryLoading}
            error={summaryError}
          />
        </div>
      </div>
    </section>
  )
}

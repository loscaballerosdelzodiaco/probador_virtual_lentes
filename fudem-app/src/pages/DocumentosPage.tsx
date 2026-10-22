import { useEffect, useState, type FormEvent } from 'react'
import {
  DOCUMENTO_REGISTRO_ERROR_MESSAGE,
  DOCUMENTOS_LOAD_ERROR_MESSAGE,
  descargarDocumento,
  guardarDocumento,
  listarDocumentos,
  type DocumentoCliente,
  type TipoDocumento,
} from '../services/documentoService'

const ESTADO_LABEL: Record<DocumentoCliente['estado_recepcion'], string> = {
  pendiente: 'Pendiente',
  recibida: 'Recibida',
  rechazada: 'Rechazada',
}

const TIPO_LABEL: Record<TipoDocumento, string> = {
  receta: 'Receta',
  examen: 'Examen',
}

const TIPO_OPCIONES: Array<{
  value: TipoDocumento
  title: string
  description: string
}> = [
  {
    value: 'receta',
    title: 'Receta',
    description: 'Indicación óptica para armar los lentes.',
  },
  {
    value: 'examen',
    title: 'Examen',
    description: 'Resultado de la evaluación visual.',
  },
]

export function DocumentosPage() {
  const [documentos, setDocumentos] = useState<DocumentoCliente[]>([])
  const [tipo, setTipo] = useState<TipoDocumento>('receta')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    listarDocumentos()
      .then((rows) => {
        if (!active) return
        setDocumentos(rows)
        setLoadError(null)
      })
      .catch((error: unknown) => {
        if (!active) return
        console.error(error)
        setDocumentos([])
        setLoadError(DOCUMENTOS_LOAD_ERROR_MESSAGE)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const form = event.currentTarget
    const archivoInput = form.elements.namedItem('archivo')
    const file =
      archivoInput instanceof HTMLInputElement ? archivoInput.files?.[0] : null
    if (!file) {
      setFormError('Selecciona un PDF o una imagen para continuar.')
      return
    }

    setFormError(null)
    setStatusMessage(null)
    setIsSubmitting(true)

    try {
      const creado = await guardarDocumento(tipo, file)
      setDocumentos((current) => [creado, ...current])
      setStatusMessage('Archivo recibido y guardado.')
      form.reset()
      setTipo('receta')
    } catch (error: unknown) {
      setFormError(
        error instanceof Error ? error.message : DOCUMENTO_REGISTRO_ERROR_MESSAGE,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDownload(documento: DocumentoCliente) {
    setFormError(null)
    try {
      const blob = await descargarDocumento(documento)
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = documento.nombre_archivo
      link.rel = 'noopener'
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000)
    } catch (error: unknown) {
      console.error(error)
      setFormError(
        error instanceof Error ? error.message : DOCUMENTOS_LOAD_ERROR_MESSAGE,
      )
    }
  }

  return (
    <section id="documentos" className="section">
      <div className="row">
        <nav className="breadcrumb" aria-label="Miga de pan">
          <a href="/catalogo">Inicio</a> / Recetas y exámenes
        </nav>
        <h1>Recetas y exámenes</h1>
        <p>
          Sube un PDF o una imagen. El archivo queda privado y se asocia a tu
          cuenta automáticamente.
        </p>

        <form className="auth-form documentos-form" onSubmit={handleSubmit} noValidate>
          <fieldset className="documentos-tipo">
            <legend>Tipo de archivo</legend>
            <div className="documentos-tipo__grid">
              {TIPO_OPCIONES.map((opcion) => {
                const selected = tipo === opcion.value
                return (
                  <label
                    key={opcion.value}
                    className={
                      selected
                        ? 'documentos-tipo__card is-selected'
                        : 'documentos-tipo__card'
                    }
                  >
                    <input
                      type="radio"
                      name="tipo"
                      value={opcion.value}
                      checked={selected}
                      disabled={isSubmitting}
                      onChange={() => setTipo(opcion.value)}
                    />
                    <span className="documentos-tipo__title">{opcion.title}</span>
                    <span className="documentos-tipo__hint">{opcion.description}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>
          <div className="auth-form__field">
            <label htmlFor="documento-archivo">Archivo</label>
            <input
              id="documento-archivo"
              name="archivo"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
              disabled={isSubmitting}
              required
            />
            <p>PDF, JPG, PNG o WEBP. Máximo 10 MB.</p>
          </div>
          <button className="btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Recibiendo…' : 'Recibir archivo'}
          </button>
        </form>

        {formError ? (
          <p className="notice notice--error" role="alert">
            {formError}
          </p>
        ) : null}
        {statusMessage ? (
          <p className="notice" role="status">
            {statusMessage}
          </p>
        ) : null}

        {isLoading ? <p role="status">Cargando archivos…</p> : null}
        {loadError ? (
          <p className="notice notice--error" role="alert">
            {loadError}
          </p>
        ) : null}

        {!isLoading && !loadError && documentos.length === 0 ? (
          <p className="notice" role="status">
            Todavía no has cargado recetas ni exámenes.
          </p>
        ) : null}

        {documentos.length > 0 ? (
          <ul className="documentos-list">
            {documentos.map((documento) => (
              <li key={documento.id}>
                <p>
                  <strong>{TIPO_LABEL[documento.tipo]}</strong> · {documento.nombre_archivo}
                </p>
                <p>
                  {new Date(documento.fecha_carga).toLocaleString('es-SV')} ·{' '}
                  {ESTADO_LABEL[documento.estado_recepcion]}
                </p>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => void handleDownload(documento)}
                >
                  Descargar
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  )
}

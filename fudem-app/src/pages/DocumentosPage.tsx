import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { MAX_DOCUMENTO_BYTES, validateDocumentoFile } from '../lib/documentoStorage'
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

const ARCHIVO_ACCEPT =
  'application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp'
const FOTO_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'
const MAX_DOCUMENTO_MB = MAX_DOCUMENTO_BYTES / (1024 * 1024)
const MISSING_FILE_MESSAGE = 'Selecciona un PDF o una imagen para continuar.'

type EstadoCarga = 'pending' | 'selected' | 'uploading' | 'success' | 'error'

const ESTADO_CARGA_LABEL: Record<EstadoCarga, string> = {
  pending: 'Archivo pendiente de selección',
  selected: 'Archivo seleccionado',
  uploading: 'Carga en proceso',
  success: 'Carga exitosa',
  error: 'No se pudo cargar el archivo',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [rejectedName, setRejectedName] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<EstadoCarga>('pending')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

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

  function clearFileInputs() {
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  function handleIncomingFile(file: File | undefined) {
    setStatusMessage(null)
    if (!file) return

    const validationError = validateDocumentoFile(file)
    if (validationError) {
      setSelectedFile(null)
      setRejectedName(file.name)
      setFormError(validationError)
      setUploadStatus('error')
      return
    }

    setRejectedName(null)
    setFormError(null)
    setSelectedFile(file)
    setUploadStatus('selected')
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    handleIncomingFile(file)
  }

  function handleRemoveFile() {
    clearFileInputs()
    setSelectedFile(null)
    setRejectedName(null)
    setFormError(null)
    setStatusMessage(null)
    setUploadStatus('pending')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const file = selectedFile
    if (!file) {
      setStatusMessage(null)
      setFormError(MISSING_FILE_MESSAGE)
      setUploadStatus('error')
      return
    }

    const validationError = validateDocumentoFile(file)
    if (validationError) {
      setSelectedFile(null)
      setRejectedName(file.name)
      setStatusMessage(null)
      setFormError(validationError)
      setUploadStatus('error')
      return
    }

    setFormError(null)
    setStatusMessage(null)
    setIsSubmitting(true)
    setUploadStatus('uploading')

    try {
      const creado = await guardarDocumento(tipo, file)
      setDocumentos((current) => [creado, ...current])
      setStatusMessage(
        tipo === 'receta' ? 'Receta recibida y guardada.' : 'Examen recibido y guardado.',
      )
      setSelectedFile(null)
      setRejectedName(null)
      clearFileInputs()
      setTipo('receta')
      setUploadStatus('success')
    } catch (error: unknown) {
      setFormError(
        error instanceof Error ? error.message : DOCUMENTO_REGISTRO_ERROR_MESSAGE,
      )
      setUploadStatus('error')
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
          Adjunta una fotografía o un archivo de tu receta. Queda privado y se
          asocia a tu cuenta solo cuando se recibe correctamente.
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
            <div
              className={`documentos-upload is-${uploadStatus}`}
              aria-busy={uploadStatus === 'uploading'}
            >
              <p id="documento-estado" className="documentos-upload__status" role="status">
                {ESTADO_CARGA_LABEL[uploadStatus]}
              </p>
              <p id="documento-formatos" className="documentos-upload__hint">
                {`Formatos permitidos: PDF, JPG, PNG y WEBP. Tamaño máximo: ${MAX_DOCUMENTO_MB} MB.`}
              </p>
              {selectedFile ? (
                <div className="documentos-upload__file">
                  <p className="documentos-upload__name">{selectedFile.name}</p>
                  <p className="documentos-upload__hint">{formatFileSize(selectedFile.size)}</p>
                </div>
              ) : null}
              {rejectedName && !selectedFile ? (
                <p className="documentos-upload__name">Archivo no aceptado: {rejectedName}</p>
              ) : null}
              <div className="documentos-upload__actions">
                <button
                  type="button"
                  className="btn btn--outline"
                  disabled={isSubmitting}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {selectedFile ? 'Cambiar archivo' : 'Seleccionar archivo'}
                </button>
                <button
                  type="button"
                  className="btn btn--outline"
                  disabled={isSubmitting}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  Tomar fotografía
                </button>
                {selectedFile ? (
                  <button
                    type="button"
                    className="btn btn--outline"
                    disabled={isSubmitting}
                    onClick={handleRemoveFile}
                  >
                    Quitar archivo
                  </button>
                ) : null}
              </div>
              <p className="documentos-upload__hint">
                En un celular, Tomar fotografía abre la cámara.
              </p>
            </div>
            <input
              ref={fileInputRef}
              id="documento-archivo"
              name="archivo"
              className="visually-hidden"
              type="file"
              accept={ARCHIVO_ACCEPT}
              aria-describedby="documento-formatos documento-estado"
              disabled={isSubmitting}
              onChange={handleFileChange}
            />
            <input
              ref={cameraInputRef}
              id="documento-camara"
              className="visually-hidden"
              type="file"
              accept={FOTO_ACCEPT}
              capture="environment"
              aria-label="Fotografía desde la cámara"
              aria-describedby="documento-formatos documento-estado"
              disabled={isSubmitting}
              onChange={handleFileChange}
            />
          </div>
          <button className="btn" type="submit" disabled={isSubmitting || !selectedFile}>
            {isSubmitting ? 'Cargando…' : 'Recibir archivo'}
          </button>
        </form>

        {formError ? (
          <p className="notice notice--error" role="alert">
            {formError}
          </p>
        ) : null}
        {statusMessage ? (
          <p className="notice notice--success" role="status">
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

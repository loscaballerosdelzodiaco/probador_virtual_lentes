import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DocumentosPage } from '../pages/DocumentosPage'
import {
  CalidadInsuficienteError,
  DOCUMENTO_CALIDAD_BORROSA_MESSAGE,
  DOCUMENTO_CALIDAD_INSUFICIENTE,
} from '../lib/documentoCalidad'
import {
  DOCUMENTO_TEMPORARY_HINT,
  DOCUMENTO_VALIDATION_HINT,
} from '../lib/documentoErrores'
import {
  DOCUMENTO_CONNECTION_ERROR_MESSAGE,
  DOCUMENTO_CORRUPT_ERROR_MESSAGE,
  DOCUMENTO_EXTENSION_ERROR_MESSAGE,
  DOCUMENTO_SIZE_ERROR_MESSAGE,
  DOCUMENTO_STORAGE_ERROR_MESSAGE,
  MAX_DOCUMENTO_BYTES,
} from '../lib/documentoStorage'
import {
  DOCUMENTOS_LOAD_ERROR_MESSAGE,
  descargarDocumento,
  eliminarDocumento,
  guardarDocumento,
  listarDocumentos,
  listarIdsDocumentoEnPedidos,
  type DocumentoCliente,
} from '../services/documentoService'

vi.mock('../services/documentoService', async () => {
  const actual = await vi.importActual<typeof import('../services/documentoService')>(
    '../services/documentoService',
  )
  return {
    ...actual,
    listarDocumentos: vi.fn(),
    listarIdsDocumentoEnPedidos: vi.fn(),
    guardarDocumento: vi.fn(),
    descargarDocumento: vi.fn(),
    eliminarDocumento: vi.fn(),
  }
})

const usuarioId = '11111111-1111-1111-1111-111111111111'

function jpegFile(name = 'receta.jpg') {
  return new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], name, { type: 'image/jpeg' })
}

function documentoRecibido(
  nombre: string,
  estado: DocumentoCliente['estado_recepcion'] = 'recibida',
  id = 9,
): DocumentoCliente {
  return {
    id,
    usuario_id: usuarioId,
    nombre_archivo: nombre,
    tipo: 'receta',
    fecha_carga: '2026-10-22T04:00:00.000Z',
    ubicacion_archivo: `${usuarioId}/receta/secret.pdf`,
    estado_recepcion: estado,
  }
}

async function chooseFile(user: ReturnType<typeof userEvent.setup>, file: File) {
  const input = screen.getByLabelText('Archivo') as HTMLInputElement
  await user.upload(input, file)
}

function provideFile(file: File, label = 'Archivo') {
  const input = screen.getByLabelText(label) as HTMLInputElement
  Object.defineProperty(input, 'files', { configurable: true, value: [file] })
  fireEvent.change(input)
}

describe('DocumentosPage', () => {
  beforeEach(() => {
    vi.mocked(listarDocumentos).mockReset()
    vi.mocked(listarIdsDocumentoEnPedidos).mockReset()
    vi.mocked(guardarDocumento).mockReset()
    vi.mocked(descargarDocumento).mockReset()
    vi.mocked(eliminarDocumento).mockReset()
    vi.mocked(listarDocumentos).mockResolvedValue([])
    vi.mocked(listarIdsDocumentoEnPedidos).mockResolvedValue([])
    vi.mocked(eliminarDocumento).mockResolvedValue()
  })

  it('muestra un aviso amigable si falla la carga', async () => {
    vi.mocked(listarDocumentos).mockRejectedValue(new Error('JWT expired'))
    render(<DocumentosPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      DOCUMENTOS_LOAD_ERROR_MESSAGE,
    )
    expect(screen.queryByText(/JWT expired/)).not.toBeInTheDocument()
  })

  it('permite elegir receta o examen en tarjetas', async () => {
    const user = userEvent.setup()
    render(<DocumentosPage />)

    const receta = await screen.findByRole('radio', { name: /Receta/i })
    const examen = screen.getByRole('radio', { name: /Examen/i })
    expect(receta).toBeChecked()
    expect(examen).not.toBeChecked()

    await user.click(examen)
    expect(examen).toBeChecked()
    expect(receta).not.toBeChecked()
  })

  it('muestra el error de almacenamiento al guardar', async () => {
    vi.mocked(guardarDocumento).mockRejectedValue(
      new Error(DOCUMENTO_STORAGE_ERROR_MESSAGE),
    )
    const user = userEvent.setup()
    render(<DocumentosPage />)

    await screen.findByText('Todavía no has cargado recetas ni exámenes.')
    await chooseFile(user, jpegFile())
    await user.click(screen.getByRole('button', { name: 'Recibir archivo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      DOCUMENTO_STORAGE_ERROR_MESSAGE,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(DOCUMENTO_TEMPORARY_HINT)
    expect(screen.getByText('No se pudo cargar el archivo')).toBeInTheDocument()
    expect(screen.getByText('receta.jpg')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled()
    expect(
      screen.queryByRole('heading', { name: 'Receta recibida' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/utilizaremos durante tu compra/)).not.toBeInTheDocument()
  })

  it('pide una imagen nueva si la calidad de la receta no alcanza', async () => {
    vi.mocked(guardarDocumento).mockRejectedValue(
      new CalidadInsuficienteError({
        ok: false,
        estado: DOCUMENTO_CALIDAD_INSUFICIENTE,
        motivo: 'borrosa',
        error: DOCUMENTO_CALIDAD_BORROSA_MESSAGE,
      }),
    )
    const user = userEvent.setup()
    render(<DocumentosPage />)

    await screen.findByText('Todavía no has cargado recetas ni exámenes.')
    await chooseFile(user, jpegFile())
    await user.click(screen.getByRole('button', { name: 'Recibir archivo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      DOCUMENTO_CALIDAD_BORROSA_MESSAGE,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(DOCUMENTO_VALIDATION_HINT)
    expect(screen.getByText('El archivo no se puede usar')).toBeInTheDocument()
    expect(screen.getByText('Archivo no aceptado: receta.jpg')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recibir archivo' })).toBeDisabled()
    expect(
      screen.queryByRole('heading', { name: 'Receta recibida' }),
    ).not.toBeInTheDocument()
  })

  it('lista el archivo recibido sin exponer la ruta de Storage', async () => {
    vi.mocked(guardarDocumento).mockResolvedValue(documentoRecibido('receta.pdf'))
    const user = userEvent.setup()
    render(<DocumentosPage />)

    await screen.findByText('Todavía no has cargado recetas ni exámenes.')
    await chooseFile(user, jpegFile())
    await user.click(screen.getByRole('button', { name: 'Recibir archivo' }))

    expect(await screen.findByRole('heading', { name: 'Receta recibida' })).toBeInTheDocument()
    expect(screen.getByText(/utilizaremos durante tu compra/)).toBeInTheDocument()
    expect(screen.getAllByText('receta.pdf').length).toBeGreaterThan(0)
    expect(screen.getByText(/Recibida/)).toBeInTheDocument()
    expect(screen.getByText('Carga exitosa')).toBeInTheDocument()
    expect(screen.queryByText('Receta recibida y guardada.')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continuar con la compra' })).toHaveAttribute(
      'href',
      '/catalogo',
    )
    expect(screen.queryByText(/secret\.pdf/)).not.toBeInTheDocument()
    await waitFor(() => {
      expect(guardarDocumento).toHaveBeenCalledWith('receta', expect.any(File))
    })
  })

  it('oculta la confirmación después de subir la receta', async () => {
    vi.mocked(guardarDocumento).mockResolvedValue(documentoRecibido('receta.pdf'))
    const user = userEvent.setup()
    render(<DocumentosPage alertDismissMs={40} />)

    await screen.findByText('Todavía no has cargado recetas ni exámenes.')
    await chooseFile(user, jpegFile())
    await user.click(screen.getByRole('button', { name: 'Recibir archivo' }))

    expect(await screen.findByRole('heading', { name: 'Receta recibida' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Receta recibida' })).not.toBeInTheDocument()
    })
    expect(screen.getByText(/receta\.pdf/)).toBeInTheDocument()
  })

  it('no deja fija la confirmación de una receta ya cargada', async () => {
    vi.mocked(listarDocumentos).mockResolvedValue([documentoRecibido('mi-receta.pdf')])
    render(<DocumentosPage />)

    expect(await screen.findByText(/mi-receta\.pdf/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Receta recibida' })).not.toBeInTheDocument()
    expect(screen.queryByText(/utilizaremos durante tu compra/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Continuar con la compra' })).not.toBeInTheDocument()
    expect(guardarDocumento).not.toHaveBeenCalled()
  })

  it('pide una receta nueva si la recibida ya se usó en un pedido', async () => {
    const usada = documentoRecibido('mi-receta.pdf')
    vi.mocked(listarDocumentos).mockResolvedValue([usada])
    vi.mocked(listarIdsDocumentoEnPedidos).mockResolvedValue([usada.id])
    render(<DocumentosPage />)

    expect(
      await screen.findByText('Aún no hemos recibido una receta para tu compra.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Receta recibida' })).not.toBeInTheDocument()
    expect(screen.getByText(/mi-receta\.pdf/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reemplazar receta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar receta' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descargar' })).toBeInTheDocument()
  })

  it('no confirma la receta si la recepción no quedó completada', async () => {
    vi.mocked(guardarDocumento).mockResolvedValue(
      documentoRecibido('receta.pdf', 'pendiente'),
    )
    const user = userEvent.setup()
    render(<DocumentosPage />)

    await screen.findByText('Aún no hemos recibido una receta para tu compra.')
    await chooseFile(user, jpegFile())
    await user.click(screen.getByRole('button', { name: 'Recibir archivo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos confirmar la recepción de la receta. Inténtalo de nuevo.',
    )
    expect(screen.queryByRole('heading', { name: 'Receta recibida' })).not.toBeInTheDocument()
    expect(screen.queryByText(/utilizaremos durante tu compra/)).not.toBeInTheDocument()
    expect(screen.queryByText('Carga exitosa')).not.toBeInTheDocument()
    expect(screen.getByText(/Pendiente/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled()
  })

  it('permite reintentar la recepción y confirmar solo el intento exitoso', async () => {
    vi.mocked(guardarDocumento)
      .mockRejectedValueOnce(new Error(DOCUMENTO_STORAGE_ERROR_MESSAGE))
      .mockResolvedValueOnce(documentoRecibido('receta-final.jpg', 'recibida', 4))
    const user = userEvent.setup()
    render(<DocumentosPage />)

    await screen.findByText('Aún no hemos recibido una receta para tu compra.')
    await chooseFile(user, jpegFile('receta-final.jpg'))
    await user.click(screen.getByRole('button', { name: 'Recibir archivo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(DOCUMENTO_STORAGE_ERROR_MESSAGE)
    expect(screen.queryByRole('heading', { name: 'Receta recibida' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { name: 'Receta recibida' })).toBeInTheDocument()
    expect(screen.getAllByText('receta-final.jpg').length).toBeGreaterThan(0)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(guardarDocumento).toHaveBeenCalledTimes(2)
  })

  it('conserva la receta recibida si un envío posterior falla', async () => {
    vi.mocked(listarDocumentos).mockResolvedValue([documentoRecibido('receta-ok.pdf')])
    vi.mocked(guardarDocumento).mockRejectedValue(new Error(DOCUMENTO_STORAGE_ERROR_MESSAGE))
    const user = userEvent.setup()
    render(<DocumentosPage />)

    expect(await screen.findByText(/receta-ok\.pdf/)).toBeInTheDocument()
    await chooseFile(user, jpegFile('falla.jpg'))
    await user.click(screen.getByRole('button', { name: 'Recibir archivo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(DOCUMENTO_STORAGE_ERROR_MESSAGE)
    expect(screen.queryByRole('heading', { name: 'Receta recibida' })).not.toBeInTheDocument()
    expect(screen.getAllByText(/receta-ok\.pdf/).length).toBeGreaterThan(0)
  })

  it('no presenta como recibida una receta rechazada', async () => {
    vi.mocked(listarDocumentos).mockResolvedValue([
      documentoRecibido('receta-rechazada.pdf', 'rechazada'),
    ])
    render(<DocumentosPage />)

    expect(
      await screen.findByText('Aún no hemos recibido una receta para tu compra.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Receta recibida' })).not.toBeInTheDocument()
    expect(screen.getByText(/Rechazada/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Continuar con la compra' })).not.toBeInTheDocument()
  })

  it('muestra formatos, tamaño máximo y el estado pendiente', async () => {
    render(<DocumentosPage />)

    expect(await screen.findByText('Archivo pendiente de selección')).toBeInTheDocument()
    expect(screen.getByText(/Formatos permitidos: PDF, JPG, PNG y WEBP/)).toBeInTheDocument()
    expect(screen.getByText(/Tamaño máximo: 10 MB/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recibir archivo' })).toBeDisabled()
    expect(screen.getByLabelText('Fotografía desde la cámara')).toHaveAttribute(
      'capture',
      'environment',
    )
  })

  it('muestra el nombre elegido y permite quitarlo o cambiarlo', async () => {
    const user = userEvent.setup()
    render(<DocumentosPage />)

    await screen.findByText('Archivo pendiente de selección')
    await chooseFile(user, jpegFile('mi-receta.jpg'))

    expect(screen.getByText('Archivo seleccionado')).toBeInTheDocument()
    expect(screen.getByText('mi-receta.jpg')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Quitar archivo' }))
    expect(screen.getByText('Archivo pendiente de selección')).toBeInTheDocument()
    expect(screen.queryByText('mi-receta.jpg')).not.toBeInTheDocument()
    expect(guardarDocumento).not.toHaveBeenCalled()

    await chooseFile(user, jpegFile('otra-receta.jpg'))
    expect(screen.getByText('otra-receta.jpg')).toBeInTheDocument()
    await chooseFile(user, jpegFile('receta-final.jpg'))
    expect(screen.getByText('receta-final.jpg')).toBeInTheDocument()
    expect(screen.queryByText('otra-receta.jpg')).not.toBeInTheDocument()
  })

  it('rechaza formato o tamaño inválido antes de cargar', async () => {
    render(<DocumentosPage />)
    await screen.findByText('Archivo pendiente de selección')

    provideFile(new File(['gif'], 'receta.gif', { type: 'image/gif' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      DOCUMENTO_EXTENSION_ERROR_MESSAGE,
    )
    expect(screen.getByText('Archivo no aceptado: receta.gif')).toBeInTheDocument()
    expect(screen.getByText('El archivo no se puede usar')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(DOCUMENTO_VALIDATION_HINT)
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    expect(guardarDocumento).not.toHaveBeenCalled()

    const tooBig = jpegFile('grande.jpg')
    Object.defineProperty(tooBig, 'size', { value: MAX_DOCUMENTO_BYTES + 1 })
    provideFile(tooBig)
    expect(await screen.findByRole('alert')).toHaveTextContent(DOCUMENTO_SIZE_ERROR_MESSAGE)
    expect(screen.getByText('Archivo no aceptado: grande.jpg')).toBeInTheDocument()
    expect(guardarDocumento).not.toHaveBeenCalled()
  })

  it('toma una fotografía y muestra la carga en proceso', async () => {
    let resolveSave: (value: Awaited<ReturnType<typeof guardarDocumento>>) => void = () => {}
    vi.mocked(guardarDocumento).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve
        }),
    )
    const user = userEvent.setup()
    render(<DocumentosPage />)
    await screen.findByText('Archivo pendiente de selección')

    const camera = screen.getByLabelText('Fotografía desde la cámara') as HTMLInputElement
    await user.upload(camera, jpegFile('foto-receta.jpg'))
    expect(screen.getByText('foto-receta.jpg')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Recibir archivo' }))
    expect(screen.getByText('Carga en proceso')).toBeInTheDocument()
    expect(guardarDocumento).toHaveBeenCalledTimes(1)

    resolveSave({
      id: 3,
      usuario_id: usuarioId,
      nombre_archivo: 'foto-receta.jpg',
      tipo: 'receta',
      fecha_carga: '2026-10-22T04:00:00.000Z',
      ubicacion_archivo: `${usuarioId}/receta/foto-receta.jpg`,
      estado_recepcion: 'recibida',
    })

    expect(await screen.findByText('Carga exitosa')).toBeInTheDocument()
  })

  it('reemplaza la receta recibida y actualiza la confirmación', async () => {
    vi.mocked(listarDocumentos).mockResolvedValue([documentoRecibido('receta-ok.pdf')])
    vi.mocked(guardarDocumento).mockResolvedValue(
      documentoRecibido('nueva-receta.jpg', 'recibida', 12),
    )
    const user = userEvent.setup()
    render(<DocumentosPage />)

    await user.click(await screen.findByRole('button', { name: 'Reemplazar receta' }))
    expect(screen.getByRole('region', { name: 'Corrección de receta' })).toHaveTextContent(
      'receta-ok.pdf',
    )
    expect(screen.getByRole('button', { name: 'Confirmar reemplazo' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /Examen/i })).toBeDisabled()

    await chooseFile(user, jpegFile('nueva-receta.jpg'))
    expect(screen.getByText('Archivo seleccionado')).toBeInTheDocument()
    expect(screen.getByText('nueva-receta.jpg')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmar reemplazo' }))

    const confirmacion = await screen.findByRole('status', { name: 'Confirmación de receta' })
    expect(confirmacion).toHaveTextContent('nueva-receta.jpg')
    expect(confirmacion).not.toHaveTextContent('receta-ok.pdf')
    expect(screen.getByText(/receta-ok\.pdf/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Corrección de receta' })).not.toBeInTheDocument()
    expect(guardarDocumento).toHaveBeenCalledWith('receta', expect.any(File))
  })

  it('cancela la corrección antes de confirmar y conserva la receta', async () => {
    vi.mocked(listarDocumentos).mockResolvedValue([documentoRecibido('receta-ok.pdf')])
    const user = userEvent.setup()
    render(<DocumentosPage />)

    await user.click(await screen.findByRole('button', { name: 'Reemplazar receta' }))
    await chooseFile(user, jpegFile('nueva-receta.jpg'))
    expect(screen.getByText('Archivo seleccionado')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('region', { name: 'Corrección de receta' })).not.toBeInTheDocument()
    expect(screen.queryByText('nueva-receta.jpg')).not.toBeInTheDocument()
    expect(screen.getByText('Archivo pendiente de selección')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Receta recibida' })).not.toBeInTheDocument()
    expect(screen.getByText(/receta-ok\.pdf/)).toBeInTheDocument()
    expect(guardarDocumento).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Recibir archivo' })).toBeDisabled()
  })

  it('rechaza un archivo inválido al corregir y conserva la receta', async () => {
    vi.mocked(listarDocumentos).mockResolvedValue([documentoRecibido('receta-ok.pdf')])
    const user = userEvent.setup()
    render(<DocumentosPage />)

    await user.click(await screen.findByRole('button', { name: 'Reemplazar receta' }))
    provideFile(new File(['gif'], 'receta.gif', { type: 'image/gif' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      DOCUMENTO_EXTENSION_ERROR_MESSAGE,
    )
    expect(screen.getByText('Archivo no aceptado: receta.gif')).toBeInTheDocument()
    expect(screen.getByText('El archivo no se puede usar')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Receta recibida' })).not.toBeInTheDocument()
    expect(screen.getAllByText(/receta-ok\.pdf/).length).toBeGreaterThan(0)
    expect(guardarDocumento).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled()
  })

  it('conserva la receta anterior si falla el reemplazo y permite reintentarlo', async () => {
    vi.mocked(listarDocumentos).mockResolvedValue([documentoRecibido('receta-ok.pdf')])
    vi.mocked(guardarDocumento)
      .mockRejectedValueOnce(new Error(DOCUMENTO_STORAGE_ERROR_MESSAGE))
      .mockResolvedValueOnce(documentoRecibido('nueva-receta.jpg', 'recibida', 15))
    const user = userEvent.setup()
    render(<DocumentosPage />)

    await user.click(await screen.findByRole('button', { name: 'Reemplazar receta' }))
    await chooseFile(user, jpegFile('nueva-receta.jpg'))
    await user.click(screen.getByRole('button', { name: 'Confirmar reemplazo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(DOCUMENTO_STORAGE_ERROR_MESSAGE)
    expect(screen.queryByRole('heading', { name: 'Receta recibida' })).not.toBeInTheDocument()
    expect(screen.getAllByText(/receta-ok\.pdf/).length).toBeGreaterThan(0)
    expect(screen.getByRole('region', { name: 'Corrección de receta' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('status', { name: 'Confirmación de receta' })).toHaveTextContent(
      'nueva-receta.jpg',
    )
    expect(
      screen.getByRole('status', { name: 'Confirmación de receta' }),
    ).not.toHaveTextContent('receta-ok.pdf')
    expect(guardarDocumento).toHaveBeenCalledTimes(2)
  })

  it('permite reintentar un fallo de conexión sin volver a elegir el archivo', async () => {
    vi.mocked(guardarDocumento)
      .mockRejectedValueOnce(new Error(DOCUMENTO_CONNECTION_ERROR_MESSAGE))
      .mockResolvedValueOnce(documentoRecibido('receta.jpg', 'recibida', 21))
    const user = userEvent.setup()
    render(<DocumentosPage />)

    await screen.findByText('Aún no hemos recibido una receta para tu compra.')
    await chooseFile(user, jpegFile())
    await user.click(screen.getByRole('button', { name: 'Recibir archivo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      DOCUMENTO_CONNECTION_ERROR_MESSAGE,
    )
    expect(screen.getByText('receta.jpg')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { name: 'Receta recibida' })).toBeInTheDocument()
    expect(guardarDocumento).toHaveBeenCalledTimes(2)
  })

  it('pide otro archivo si el contenido está dañado', async () => {
    vi.mocked(guardarDocumento).mockRejectedValue(new Error(DOCUMENTO_CORRUPT_ERROR_MESSAGE))
    const user = userEvent.setup()
    render(<DocumentosPage />)

    await screen.findByText('Todavía no has cargado recetas ni exámenes.')
    await chooseFile(user, jpegFile())
    await user.click(screen.getByRole('button', { name: 'Recibir archivo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(DOCUMENTO_CORRUPT_ERROR_MESSAGE)
    expect(screen.getByRole('alert')).toHaveTextContent(DOCUMENTO_VALIDATION_HINT)
    expect(screen.getByText('El archivo no se puede usar')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Receta recibida' }),
    ).not.toBeInTheDocument()
  })

  it('oculta la alerta de calidad después de unos segundos', async () => {
    vi.mocked(guardarDocumento).mockRejectedValue(
      new CalidadInsuficienteError({
        ok: false,
        estado: DOCUMENTO_CALIDAD_INSUFICIENTE,
        motivo: 'borrosa',
        error: DOCUMENTO_CALIDAD_BORROSA_MESSAGE,
      }),
    )
    const user = userEvent.setup()
    render(<DocumentosPage alertDismissMs={40} />)

    await screen.findByText('Todavía no has cargado recetas ni exámenes.')
    await chooseFile(user, jpegFile())
    await user.click(screen.getByRole('button', { name: 'Recibir archivo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      DOCUMENTO_CALIDAD_BORROSA_MESSAGE,
    )
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  it('permite eliminar un examen ya ingresado', async () => {
    const examen: DocumentoCliente = {
      ...documentoRecibido('examen.png', 'recibida', 7),
      tipo: 'examen',
    }
    vi.mocked(listarDocumentos).mockResolvedValue([examen])
    const user = userEvent.setup()
    render(<DocumentosPage />)

    expect(await screen.findByText(/examen\.png/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(eliminarDocumento).toHaveBeenCalledWith(examen)
    expect(await screen.findByText('Documento eliminado.')).toBeInTheDocument()
    expect(screen.queryByText(/examen\.png/)).not.toBeInTheDocument()
  })

  it('permite eliminar la receta recibida', async () => {
    vi.mocked(listarDocumentos).mockResolvedValue([documentoRecibido('mi-receta.pdf')])
    const user = userEvent.setup()
    render(<DocumentosPage />)

    expect(await screen.findByText(/mi-receta\.pdf/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Receta recibida' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Eliminar receta' }))

    expect(eliminarDocumento).toHaveBeenCalledWith(
      expect.objectContaining({ nombre_archivo: 'mi-receta.pdf', tipo: 'receta' }),
    )
    expect(await screen.findByText('Receta eliminada.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Receta recibida' })).not.toBeInTheDocument()
    expect(
      screen.getByText('Aún no hemos recibido una receta para tu compra.'),
    ).toBeInTheDocument()
  })
})

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DocumentosPage } from '../pages/DocumentosPage'
import {
  DOCUMENTO_FORMAT_ERROR_MESSAGE,
  DOCUMENTO_SIZE_ERROR_MESSAGE,
  DOCUMENTO_STORAGE_ERROR_MESSAGE,
  MAX_DOCUMENTO_BYTES,
} from '../lib/documentoStorage'
import {
  DOCUMENTOS_LOAD_ERROR_MESSAGE,
  descargarDocumento,
  guardarDocumento,
  listarDocumentos,
} from '../services/documentoService'

vi.mock('../services/documentoService', async () => {
  const actual = await vi.importActual<typeof import('../services/documentoService')>(
    '../services/documentoService',
  )
  return {
    ...actual,
    listarDocumentos: vi.fn(),
    guardarDocumento: vi.fn(),
    descargarDocumento: vi.fn(),
  }
})

const usuarioId = '11111111-1111-1111-1111-111111111111'

function jpegFile(name = 'receta.jpg') {
  return new File([new Uint8Array([0xff, 0xd8, 0xff])], name, { type: 'image/jpeg' })
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
    vi.mocked(guardarDocumento).mockReset()
    vi.mocked(descargarDocumento).mockReset()
    vi.mocked(listarDocumentos).mockResolvedValue([])
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
    expect(screen.getByText('No se pudo cargar el archivo')).toBeInTheDocument()
    expect(screen.getByText('receta.jpg')).toBeInTheDocument()
  })

  it('lista el archivo recibido sin exponer la ruta de Storage', async () => {
    vi.mocked(guardarDocumento).mockResolvedValue({
      id: 9,
      usuario_id: usuarioId,
      nombre_archivo: 'receta.pdf',
      tipo: 'receta',
      fecha_carga: '2026-10-22T04:00:00.000Z',
      ubicacion_archivo: `${usuarioId}/receta/secret.pdf`,
      estado_recepcion: 'recibida',
    })
    const user = userEvent.setup()
    render(<DocumentosPage />)

    await screen.findByText('Todavía no has cargado recetas ni exámenes.')
    await chooseFile(user, jpegFile())
    await user.click(screen.getByRole('button', { name: 'Recibir archivo' }))

    expect(await screen.findByText(/receta.pdf/)).toBeInTheDocument()
    expect(screen.getByText(/Recibida/)).toBeInTheDocument()
    expect(screen.getByText('Carga exitosa')).toBeInTheDocument()
    expect(screen.getByText('Receta recibida y guardada.')).toBeInTheDocument()
    expect(screen.queryByText(/secret\.pdf/)).not.toBeInTheDocument()
    await waitFor(() => {
      expect(guardarDocumento).toHaveBeenCalledWith('receta', expect.any(File))
    })
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
    expect(screen.getByRole('alert')).toHaveTextContent(DOCUMENTO_FORMAT_ERROR_MESSAGE)
    expect(screen.getByText('Archivo no aceptado: receta.gif')).toBeInTheDocument()
    expect(screen.getByText('No se pudo cargar el archivo')).toBeInTheDocument()
    expect(guardarDocumento).not.toHaveBeenCalled()

    const tooBig = jpegFile('grande.jpg')
    Object.defineProperty(tooBig, 'size', { value: MAX_DOCUMENTO_BYTES + 1 })
    provideFile(tooBig)
    expect(screen.getByRole('alert')).toHaveTextContent(DOCUMENTO_SIZE_ERROR_MESSAGE)
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
})

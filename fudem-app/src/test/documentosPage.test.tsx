import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DocumentosPage } from '../pages/DocumentosPage'
import { DOCUMENTO_STORAGE_ERROR_MESSAGE } from '../lib/documentoStorage'
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

function chooseFile(file: File) {
  const input = screen.getByLabelText('Archivo') as HTMLInputElement
  Object.defineProperty(input, 'files', { configurable: true, value: [file] })
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
    chooseFile(new File(['jpeg'], 'receta.jpg', { type: 'image/jpeg' }))
    await user.click(screen.getByRole('button', { name: 'Recibir archivo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      DOCUMENTO_STORAGE_ERROR_MESSAGE,
    )
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
    chooseFile(new File(['jpeg'], 'receta.jpg', { type: 'image/jpeg' }))
    await user.click(screen.getByRole('button', { name: 'Recibir archivo' }))

    expect(await screen.findByText(/receta.pdf/)).toBeInTheDocument()
    expect(screen.getByText(/Recibida/)).toBeInTheDocument()
    expect(screen.queryByText(/secret\.pdf/)).not.toBeInTheDocument()
    await waitFor(() => {
      expect(guardarDocumento).toHaveBeenCalledWith('receta', expect.any(File))
    })
  })
})

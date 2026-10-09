import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { getAvailableProducts } from '../services/productService'

vi.mock('../services/productService', () => ({
  CATALOG_LOAD_ERROR_MESSAGE:
    'No pudimos cargar el catálogo. Inténtalo de nuevo en unos momentos.',
  getAvailableProducts: vi.fn(),
}))

describe('consulta del catálogo', () => {
  beforeEach(() => {
    vi.mocked(getAvailableProducts).mockReset()
  })

  it('muestra un mensaje amigable cuando Supabase falla', async () => {
    vi.mocked(getAvailableProducts).mockRejectedValue(
      new Error('JWT expired'),
    )

    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar el catálogo. Inténtalo de nuevo en unos momentos.',
    )
    expect(screen.queryByText(/JWT expired/)).not.toBeInTheDocument()
    expect(screen.queryByText('Cargando productos…')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Actualmente no hay productos disponibles.'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument()
  })
})

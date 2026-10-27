import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  SAMPLE_DEPARTAMENTOS,
  SAMPLE_MUNICIPIOS,
  SAMPLE_SUCURSALES,
} from '../data/deliveryOptions'
import {
  DELIVERY_ADDRESS_INCOMPLETE_MESSAGE,
  DELIVERY_BRANCH_REQUIRED_MESSAGE,
  DELIVERY_NO_BRANCHES_MESSAGE,
  DELIVERY_SAVE_ERROR_MESSAGE,
} from '../lib/delivery/validateDelivery'
import { DeliveryOptionsPage } from '../pages/DeliveryOptionsPage'

const catalogs = {
  departamentos: SAMPLE_DEPARTAMENTOS,
  municipios: SAMPLE_MUNICIPIOS,
  sucursales: SAMPLE_SUCURSALES,
}

async function fillDomicilio(
  user: ReturnType<typeof userEvent.setup>,
  extras: { direccion?: string; telefono?: string } = {},
) {
  await user.click(screen.getByRole('radio', { name: /Envío a domicilio/i }))
  await user.selectOptions(screen.getByLabelText('Departamento'), 'ss')
  await user.selectOptions(screen.getByLabelText('Municipio'), 'ss-soyapango')
  if (extras.direccion !== undefined) {
    await user.type(screen.getByLabelText('Dirección de entrega'), extras.direccion)
  }
  if (extras.telefono !== undefined) {
    await user.type(screen.getByLabelText('Teléfono de contacto'), extras.telefono)
  }
}

describe('DeliveryOptionsPage', () => {
  it('muestra los campos de domicilio y oculta sucursal', async () => {
    const user = userEvent.setup()
    render(<DeliveryOptionsPage {...catalogs} />)

    expect(screen.getByRole('heading', { name: 'Forma de entrega' })).toBeInTheDocument()
    expect(screen.getByText('Resumen de entrega')).toBeInTheDocument()
    expect(
      screen.getByText('Confirma una forma de entrega para ver el resumen aquí.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Departamento')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /Envío a domicilio/i }))
    expect(screen.getByLabelText('Departamento')).toBeInTheDocument()
    expect(screen.getByLabelText('Municipio')).toBeInTheDocument()
    expect(screen.getByLabelText('Dirección de entrega')).toBeInTheDocument()
    expect(screen.getByLabelText('Teléfono de contacto')).toBeInTheDocument()
    expect(screen.queryByLabelText('Sucursal')).not.toBeInTheDocument()
  })

  it('muestra solo sucursal cuando elige retiro', async () => {
    const user = userEvent.setup()
    render(<DeliveryOptionsPage {...catalogs} />)

    await user.click(screen.getByRole('radio', { name: /Retiro en sucursal/i }))
    expect(screen.getByLabelText('Sucursal')).toBeInTheDocument()
    expect(screen.queryByLabelText('Departamento')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Dirección de entrega')).not.toBeInTheDocument()
  })

  it('filtra municipios según el departamento', async () => {
    const user = userEvent.setup()
    render(<DeliveryOptionsPage {...catalogs} />)

    await user.click(screen.getByRole('radio', { name: /Envío a domicilio/i }))
    await user.selectOptions(screen.getByLabelText('Departamento'), 'ss')

    const municipio = screen.getByLabelText('Municipio')
    expect(within(municipio).getByRole('option', { name: 'San Salvador' })).toBeInTheDocument()
    expect(within(municipio).getByRole('option', { name: 'Soyapango' })).toBeInTheDocument()
    expect(within(municipio).queryByRole('option', { name: 'Santa Tecla' })).not.toBeInTheDocument()
  })

  it('llena el resumen y llama onConfirm al confirmar', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<DeliveryOptionsPage {...catalogs} onConfirm={onConfirm} />)

    await fillDomicilio(user, { direccion: 'Calle 1', telefono: '7000-0000' })
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onConfirm).toHaveBeenCalledWith({
      method: 'domicilio',
      departamentoId: 'ss',
      municipioId: 'ss-soyapango',
      direccion: 'Calle 1',
      telefono: '7000-0000',
    })
    const resumen = screen.getByRole('complementary')
    expect(resumen).toHaveTextContent('Envío a domicilio')
    expect(resumen).toHaveTextContent('Soyapango')
    expect(resumen).toHaveTextContent('Calle 1')
  })

  it('deja solo envío a domicilio si no hay sucursales', () => {
    render(
      <DeliveryOptionsPage
        departamentos={SAMPLE_DEPARTAMENTOS}
        municipios={SAMPLE_MUNICIPIOS}
        sucursales={[]}
      />,
    )

    expect(screen.getAllByText(DELIVERY_NO_BRANCHES_MESSAGE).length).toBeGreaterThan(0)
    expect(screen.getByRole('radio', { name: /Retiro en sucursal/i })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /Envío a domicilio/i })).toBeChecked()
    expect(screen.getByLabelText('Departamento')).toBeInTheDocument()
    expect(screen.queryByLabelText('Sucursal')).not.toBeInTheDocument()
  })
})

describe('validación de forma de entrega', () => {
  it('envío completo: confirma y llama onConfirm', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<DeliveryOptionsPage {...catalogs} onConfirm={onConfirm} />)

    await fillDomicilio(user, { direccion: 'Col. Escalón, casa 12', telefono: '78561234' })
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onConfirm).toHaveBeenCalledWith({
      method: 'domicilio',
      departamentoId: 'ss',
      municipioId: 'ss-soyapango',
      direccion: 'Col. Escalón, casa 12',
      telefono: '78561234',
    })
    expect(screen.queryByText(DELIVERY_ADDRESS_INCOMPLETE_MESSAGE)).not.toBeInTheDocument()
  })

  it('envío con dirección vacía: no continúa y pide completar la dirección', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<DeliveryOptionsPage {...catalogs} onConfirm={onConfirm} />)

    await fillDomicilio(user, { telefono: '78561234' })

    expect(screen.getByText(DELIVERY_ADDRESS_INCOMPLETE_MESSAGE)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('retiro sin sucursal: no continúa y pide elegir sucursal', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<DeliveryOptionsPage {...catalogs} onConfirm={onConfirm} />)

    await user.click(screen.getByRole('radio', { name: /Retiro en sucursal/i }))

    expect(screen.queryByText(DELIVERY_ADDRESS_INCOMPLETE_MESSAGE)).not.toBeInTheDocument()
    expect(screen.getByText(DELIVERY_BRANCH_REQUIRED_MESSAGE)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('sin sucursales disponibles: solo permite envío a domicilio', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(
      <DeliveryOptionsPage
        departamentos={SAMPLE_DEPARTAMENTOS}
        municipios={SAMPLE_MUNICIPIOS}
        sucursales={[]}
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getAllByText(DELIVERY_NO_BRANCHES_MESSAGE).length).toBeGreaterThan(0)
    expect(screen.getByRole('radio', { name: /Retiro en sucursal/i })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /Envío a domicilio/i })).toBeChecked()
    expect(screen.queryByLabelText('Sucursal')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()

    await user.selectOptions(screen.getByLabelText('Departamento'), 'ss')
    await user.selectOptions(screen.getByLabelText('Municipio'), 'ss-soyapango')
    await user.type(screen.getByLabelText('Dirección de entrega'), 'Calle 1')
    await user.type(screen.getByLabelText('Teléfono de contacto'), '78561234')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'domicilio', direccion: 'Calle 1' }),
    )
  })

  it('error al guardar: muestra el aviso y no llena el resumen', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    render(<DeliveryOptionsPage {...catalogs} onConfirm={onConfirm} />)

    await fillDomicilio(user, { direccion: 'Calle 1', telefono: '78561234' })
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText(DELIVERY_SAVE_ERROR_MESSAGE)).toBeInTheDocument()
    expect(screen.getByText('Confirma una forma de entrega para ver el resumen aquí.')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled()
    })
  })
})


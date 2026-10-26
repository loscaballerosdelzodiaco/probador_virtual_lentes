import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DeliveryOptionsPage } from '../pages/DeliveryOptionsPage'
import {
  SAMPLE_DEPARTAMENTOS,
  SAMPLE_MUNICIPIOS,
  SAMPLE_SUCURSALES,
} from '../data/deliveryOptions'

describe('DeliveryOptionsPage', () => {
  it('muestra los campos de domicilio y oculta sucursal', async () => {
    const user = userEvent.setup()
    render(
      <DeliveryOptionsPage
        departamentos={SAMPLE_DEPARTAMENTOS}
        municipios={SAMPLE_MUNICIPIOS}
        sucursales={SAMPLE_SUCURSALES}
      />,
    )

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
    render(
      <DeliveryOptionsPage
        departamentos={SAMPLE_DEPARTAMENTOS}
        municipios={SAMPLE_MUNICIPIOS}
        sucursales={SAMPLE_SUCURSALES}
      />,
    )

    await user.click(screen.getByRole('radio', { name: /Retiro en sucursal/i }))
    expect(screen.getByLabelText('Sucursal')).toBeInTheDocument()
    expect(screen.queryByLabelText('Departamento')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Dirección de entrega')).not.toBeInTheDocument()
  })

  it('filtra municipios según el departamento', async () => {
    const user = userEvent.setup()
    render(
      <DeliveryOptionsPage
        departamentos={SAMPLE_DEPARTAMENTOS}
        municipios={SAMPLE_MUNICIPIOS}
        sucursales={SAMPLE_SUCURSALES}
      />,
    )

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
    render(
      <DeliveryOptionsPage
        departamentos={SAMPLE_DEPARTAMENTOS}
        municipios={SAMPLE_MUNICIPIOS}
        sucursales={SAMPLE_SUCURSALES}
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole('radio', { name: /Envío a domicilio/i }))
    await user.selectOptions(screen.getByLabelText('Departamento'), 'ss')
    await user.selectOptions(screen.getByLabelText('Municipio'), 'ss-soyapango')
    await user.type(screen.getByLabelText('Dirección de entrega'), 'Calle 1')
    await user.type(screen.getByLabelText('Teléfono de contacto'), '7000-0000')
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

    expect(screen.getAllByText('No hay sucursales disponibles para retiro').length).toBeGreaterThan(
      0,
    )
    expect(screen.getByRole('radio', { name: /Retiro en sucursal/i })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /Envío a domicilio/i })).toBeChecked()
    expect(screen.getByLabelText('Departamento')).toBeInTheDocument()
    expect(screen.queryByLabelText('Sucursal')).not.toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { POSITION_STEP } from '../lib/tryOn/adjust'
import { ManualAdjustControls } from '../components/ManualAdjustControls'

const initial = { dx: 0, dy: 0, scale: 1, rotation: 0 }

describe('ManualAdjustControls', () => {
  it('mueve el lente con las flechas de posición', async () => {
    const onChange = vi.fn()
    render(<ManualAdjustControls values={initial} onChange={onChange} />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Mover arriba' }))
    expect(onChange).toHaveBeenCalledWith({
      ...initial,
      dy: -POSITION_STEP,
    })
  })

  it('no dispara cambios cuando está deshabilitado', async () => {
    const onChange = vi.fn()
    render(<ManualAdjustControls values={initial} onChange={onChange} disabled />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Mover arriba' }))
    expect(onChange).not.toHaveBeenCalled()
  })
})

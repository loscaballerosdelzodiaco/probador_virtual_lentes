import { POSITION_STEP } from '../lib/tryOn/adjust'

export type ManualAdjustValues = {
  dx: number
  dy: number
  scale: number
  rotation: number
}

export type ManualAdjustControlsProps = {
  values: ManualAdjustValues
  onChange: (next: ManualAdjustValues) => void
  disabled?: boolean
}

export function ManualAdjustControls({
  values,
  onChange,
  disabled = false,
}: ManualAdjustControlsProps) {
  function update(partial: Partial<ManualAdjustValues>) {
    onChange({ ...values, ...partial })
  }

  return (
    <section
      className="try-on__adjust"
      aria-labelledby="try-on-adjust-title"
    >
      <h2 id="try-on-adjust-title" className="try-on__block-title">
        Ajuste manual
      </h2>
      <p className="try-on__adjust-hint">
        Mueve, escala o rota el lente sobre tu foto.
      </p>

      <div className="try-on__adjust-grid">
        <fieldset className="try-on__adjust-group" disabled={disabled}>
          <legend>Posición</legend>
          <div className="try-on__nudge">
            <button
              type="button"
              className="btn--filter"
              aria-label="Mover arriba"
              onClick={() => update({ dy: values.dy - POSITION_STEP })}
            >
              ↑
            </button>
            <div className="try-on__nudge-mid">
              <button
                type="button"
                className="btn--filter"
                aria-label="Mover izquierda"
                onClick={() => update({ dx: values.dx - POSITION_STEP })}
              >
                ←
              </button>
              <button
                type="button"
                className="btn--filter"
                aria-label="Centrar"
                onClick={() => update({ dx: 0, dy: 0 })}
              >
                ·
              </button>
              <button
                type="button"
                className="btn--filter"
                aria-label="Mover derecha"
                onClick={() => update({ dx: values.dx + POSITION_STEP })}
              >
                →
              </button>
            </div>
            <button
              type="button"
              className="btn--filter"
              aria-label="Mover abajo"
              onClick={() => update({ dy: values.dy + POSITION_STEP })}
            >
              ↓
            </button>
          </div>
        </fieldset>

        <label className="try-on__slider">
          <span>Tamaño</span>
          <input
            type="range"
            min={0.6}
            max={2.2}
            step={0.02}
            value={values.scale}
            disabled={disabled}
            onChange={(event) =>
              update({ scale: Number(event.target.value) })
            }
          />
        </label>

        <label className="try-on__slider">
          <span>Rotación</span>
          <input
            type="range"
            min={-30}
            max={30}
            step={1}
            value={values.rotation}
            disabled={disabled}
            onChange={(event) =>
              update({ rotation: Number(event.target.value) })
            }
          />
        </label>
      </div>
    </section>
  )
}

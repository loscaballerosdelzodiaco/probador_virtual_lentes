import type { TryOnModel } from '../lib/tryOn/types'

export type ModelSelectorProps = {
  models: TryOnModel[]
  selectedId: number | null
  onSelect: (id: number) => void
}

export function ModelSelector({
  models,
  selectedId,
  onSelect,
}: ModelSelectorProps) {
  return (
    <section className="try-on__models" aria-labelledby="try-on-models-title">
      <h2 id="try-on-models-title" className="try-on__block-title">
        Modelos
      </h2>
      <ul className="try-on__model-list" role="listbox" aria-label="Modelos de lentes">
        {models.map((model) => {
          const isSelected = model.id === selectedId
          const label = `${model.nombre}, ${model.marca}`
          return (
            <li key={model.id} role="option" aria-selected={isSelected} aria-label={label}>
              <button
                type="button"
                className={
                  isSelected
                    ? 'try-on__model-item is-selected'
                    : 'try-on__model-item'
                }
                aria-label={label}
                onClick={() => onSelect(model.id)}
              >
                <span className="try-on__model-thumb">
                  <img src={model.imageUrl} alt="" />
                </span>
                <span className="try-on__model-name">{model.nombre}</span>
                <span className="try-on__model-brand">{model.marca}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

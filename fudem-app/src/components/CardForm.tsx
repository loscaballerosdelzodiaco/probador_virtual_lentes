import type { InputHTMLAttributes, Ref } from 'react'
import type {
  CardData,
  CardErrors,
  CardField,
} from '../lib/payment/cardValidation'

export type CardFormProps = {
  values: CardData
  errors: CardErrors
  onChange: (field: CardField, value: string) => void
  onBlur: () => void
  inputRef: (field: CardField) => Ref<HTMLInputElement>
}

type CardInputProps = {
  field: CardField
  label: string
  form: CardFormProps
} & Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'inputMode' | 'autoComplete' | 'placeholder'
>

/** T5 (A2): campo con su mensaje de error al lado (role="alert" para lectores de pantalla). */
function CardInput({ field, label, form, ...inputProps }: CardInputProps) {
  const id = `tarjeta-${field}`
  const errorId = `${id}-error`
  const error = form.errors[field]

  return (
    <div className={error ? 'pay__field pay__field--invalid' : 'pay__field'}>
      <label htmlFor={id}>{label}</label>
      <input
        {...inputProps}
        id={id}
        name={field}
        ref={form.inputRef(field)}
        value={form.values[field]}
        onChange={(event) => form.onChange(field, event.target.value)}
        onBlur={form.onBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <p id={errorId} className="pay__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** HU5 / T2: campos de la tarjeta. T5: valores, errores y máscaras llegan por props. */
export function CardForm(props: CardFormProps) {
  return (
    <fieldset className="pay__card-form">
      <legend className="pay__legend">Datos de la tarjeta</legend>

      <CardInput
        form={props}
        field="numero"
        label="Número de tarjeta"
        type="text"
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="0000 0000 0000 0000"
      />

      <CardInput
        form={props}
        field="titular"
        label="Titular de la tarjeta"
        type="text"
        autoComplete="cc-name"
        placeholder="Como aparece en la tarjeta"
      />

      <div className="pay__row">
        <CardInput
          form={props}
          field="vencimiento"
          label="Vencimiento"
          type="text"
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder="MM/AA"
        />

        <CardInput
          form={props}
          field="cvv"
          label="CVV"
          type="password"
          inputMode="numeric"
          autoComplete="cc-csc"
          placeholder="•••"
        />
      </div>
    </fieldset>
  )
}

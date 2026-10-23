export type PaymentMethod = 'tarjeta' | 'tienda'

export type PaymentMethodSelectorProps = {
  selected: PaymentMethod
  onChange: (method: PaymentMethod) => void
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'tarjeta', label: 'Tarjeta de crédito o débito' },
  { value: 'tienda', label: 'Pago en tienda' },
]

/** HU5 / T2: forma de pago de selección única. */
export function PaymentMethodSelector({
  selected,
  onChange,
}: PaymentMethodSelectorProps) {
  return (
    <fieldset className="payment__methods">
      <legend className="payment__block-title">Forma de pago</legend>
      {PAYMENT_METHODS.map((method) => (
        <label
          key={method.value}
          className={
            method.value === selected
              ? 'payment__method is-selected'
              : 'payment__method'
          }
        >
          <input
            type="radio"
            name="forma-pago"
            value={method.value}
            checked={method.value === selected}
            onChange={() => onChange(method.value)}
          />
          <span>{method.label}</span>
        </label>
      ))}
    </fieldset>
  )
}

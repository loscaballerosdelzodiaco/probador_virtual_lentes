export type PaymentMethod = 'tarjeta' | 'tienda'

export type PaymentMethodSelectorProps = {
  /** null: todavía no elige (E2) */
  selected: PaymentMethod | null
  onChange: (method: PaymentMethod) => void
  disabled?: boolean
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; hint: string }[] = [
  {
    value: 'tarjeta',
    label: 'Tarjeta de crédito o débito',
    hint: 'Pagas ahora y tu pedido queda pagado.',
  },
  {
    value: 'tienda',
    label: 'Pago en tienda',
    hint: 'Pagas al retirar tus lentes en la tienda.',
  },
]

/** HU5 / T2 y T4: forma de pago de selección única. */
export function PaymentMethodSelector({
  selected,
  onChange,
  disabled = false,
}: PaymentMethodSelectorProps) {
  return (
    <fieldset className="pay__methods" disabled={disabled}>
      <legend>Forma de pago</legend>
      {PAYMENT_METHODS.map((method) => (
        <label
          key={method.value}
          className={
            method.value === selected ? 'pay__method is-selected' : 'pay__method'
          }
        >
          <input
            type="radio"
            name="forma-pago"
            value={method.value}
            checked={method.value === selected}
            onChange={() => onChange(method.value)}
          />
          <span>
            {method.label}
            <small>{method.hint}</small>
          </span>
        </label>
      ))}
    </fieldset>
  )
}

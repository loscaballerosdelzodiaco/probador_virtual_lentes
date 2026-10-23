/** HU5 / T2: campos de la tarjeta (solo maquetación, sin validaciones). T5 agrega sus props. */
export function CardForm() {
  return (
    <fieldset className="payment__card-form">
      <legend className="payment__block-title">Datos de la tarjeta</legend>

      <div className="payment__field">
        <label htmlFor="tarjeta-numero">Número de tarjeta</label>
        <input
          id="tarjeta-numero"
          name="numero"
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 0000 0000 0000"
        />
      </div>

      <div className="payment__field">
        <label htmlFor="tarjeta-titular">Titular</label>
        <input
          id="tarjeta-titular"
          name="titular"
          type="text"
          autoComplete="cc-name"
          placeholder="Como aparece en la tarjeta"
        />
      </div>

      <div className="payment__row">
        <div className="payment__field">
          <label htmlFor="tarjeta-vencimiento">Vencimiento</label>
          <input
            id="tarjeta-vencimiento"
            name="vencimiento"
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/AA"
          />
        </div>

        <div className="payment__field">
          <label htmlFor="tarjeta-cvv">CVV</label>
          <input
            id="tarjeta-cvv"
            name="cvv"
            type="password"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="•••"
          />
        </div>
      </div>
    </fieldset>
  )
}

import { describe, expect, it } from 'vitest'
import { CalidadInsuficienteError, DOCUMENTO_CALIDAD_BORROSA_MESSAGE } from '../lib/documentoCalidad'
import {
  DOCUMENTO_CONNECTION_ERROR_MESSAGE,
  DocumentoCargaError,
  clasificarErrorCarga,
  isConnectionFailure,
} from '../lib/documentoErrores'
import { DOCUMENTO_CORRUPT_ERROR_MESSAGE } from '../lib/documentoValidation'

describe('documentoErrores', () => {
  it('separa validación de fallos temporales', () => {
    expect(
      clasificarErrorCarga(new DocumentoCargaError(DOCUMENTO_CORRUPT_ERROR_MESSAGE, 'validation')),
    ).toEqual({
      message: DOCUMENTO_CORRUPT_ERROR_MESSAGE,
      kind: 'validation',
    })
    expect(
      clasificarErrorCarga(
        new DocumentoCargaError(DOCUMENTO_CONNECTION_ERROR_MESSAGE, 'temporary'),
      ),
    ).toEqual({
      message: DOCUMENTO_CONNECTION_ERROR_MESSAGE,
      kind: 'temporary',
    })
    expect(
      clasificarErrorCarga(
        new CalidadInsuficienteError({
          ok: false,
          estado: 'calidad_insuficiente',
          motivo: 'borrosa',
          error: DOCUMENTO_CALIDAD_BORROSA_MESSAGE,
        }),
      ).kind,
    ).toBe('validation')
  })

  it('reconoce un corte de red', () => {
    expect(isConnectionFailure(new Error('Failed to fetch'))).toBe(true)
    expect(isConnectionFailure(new Error('new row violates row-level security'))).toBe(
      false,
    )
  })
})

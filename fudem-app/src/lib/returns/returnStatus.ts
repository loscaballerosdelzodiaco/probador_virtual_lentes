// Cómo se muestra el estado de una solicitud de devolución al cliente (HU7 / T6 / CA5).
// Los textos no prometen reembolsos ni recolecciones: procesar el pago y la
// logística de los lentes están fuera del alcance de la HU7.

import {
  ESTADO_DEVOLUCION,
  ESTADO_DEVOLUCION_LABEL,
  type EstadoDevolucion,
} from './returnRules'

export type ReturnStatusTone = 'pending' | 'success' | 'error' | 'done'

export type ReturnStatusInfo = {
  label: string
  description: string
  tone: ReturnStatusTone
}

const RETURN_STATUS_DETAILS: Record<
  EstadoDevolucion,
  { description: string; tone: ReturnStatusTone }
> = {
  [ESTADO_DEVOLUCION.enRevision]: {
    description: 'Estamos revisando tu solicitud.',
    tone: 'pending',
  },
  [ESTADO_DEVOLUCION.aprobada]: {
    description: 'Tu solicitud fue aprobada.',
    tone: 'success',
  },
  [ESTADO_DEVOLUCION.rechazada]: {
    description: 'Tu solicitud fue rechazada.',
    tone: 'error',
  },
  [ESTADO_DEVOLUCION.completada]: {
    description: 'Tu devolución fue completada.',
    tone: 'done',
  },
}

/** Etiqueta, explicación y color de un estado. Un estado desconocido se ve como "En revisión". */
export function returnStatusInfo(estado: string): ReturnStatusInfo {
  const known = estado in RETURN_STATUS_DETAILS ? (estado as EstadoDevolucion) : ESTADO_DEVOLUCION.enRevision
  return {
    label: ESTADO_DEVOLUCION_LABEL[known],
    ...RETURN_STATUS_DETAILS[known],
  }
}

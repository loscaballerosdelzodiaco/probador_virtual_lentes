/** Valores tal como los guarda la migración de pedido y pago (en minúscula). */
export const ESTADO_PEDIDO = {
  pendiente: 'pendiente de pago',
  pagado: 'pagado',
  /** HU7: lo marca el personal al entregar; habilita la devolución. */
  entregado: 'entregado',
} as const

export type EstadoPedido = (typeof ESTADO_PEDIDO)[keyof typeof ESTADO_PEDIDO]

/** Texto que ve el comprador. */
export const ESTADO_PEDIDO_LABEL: Record<EstadoPedido, string> = {
  'pendiente de pago': 'Pendiente de pago',
  pagado: 'Pagado',
  entregado: 'Entregado',
}

export type FormaPagoPedido = 'tarjeta' | 'tienda'

export type EstadoPago = 'aprobado' | 'rechazado'

export type PedidoRegistrado = {
  id: number
  /** Lo asigna la base de datos, por ejemplo PED-000001. */
  numero: string
  estado: EstadoPedido
}

export type EntregaPedidoDomicilio = {
  tipo: 'domicilio'
  departamento: string
  municipio: string
  direccion: string
  telefono: string
}

export type EntregaPedidoSucursal = {
  tipo: 'sucursal'
  sucursalNombre: string
  sucursalDireccion: string
}

export type EntregaPedido = EntregaPedidoDomicilio | EntregaPedidoSucursal

/** Pedido con su forma de entrega (HU6). `entrega` es null si aún no se confirmó. */
export type PedidoConEntrega = PedidoRegistrado & {
  entrega: EntregaPedido | null
}
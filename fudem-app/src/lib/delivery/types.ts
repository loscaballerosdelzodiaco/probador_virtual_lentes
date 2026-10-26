export type DeliveryMethod = 'domicilio' | 'sucursal'

export type DepartamentoOption = {
  id: string
  nombre: string
}

export type MunicipioOption = {
  id: string
  departamentoId: string
  nombre: string
}

export type SucursalOption = {
  id: string
  nombre: string
  activa?: boolean
}

export type DeliveryDomicilio = {
  method: 'domicilio'
  departamentoId: string
  municipioId: string
  direccion: string
  telefono: string
}

export type DeliverySucursal = {
  method: 'sucursal'
  sucursalId: string
}

export type DeliverySelection = DeliveryDomicilio | DeliverySucursal

import type {
  DepartamentoOption,
  MunicipioOption,
  SucursalOption,
} from '../lib/delivery/types'

/** Listas de ejemplo para la UI. Sustituir por las que cargue el backend. */
export const SAMPLE_DEPARTAMENTOS: DepartamentoOption[] = [
  { id: 'ss', nombre: 'San Salvador' },
  { id: 'la-libertad', nombre: 'La Libertad' },
]

export const SAMPLE_MUNICIPIOS: MunicipioOption[] = [
  { id: 'ss-san-salvador', departamentoId: 'ss', nombre: 'San Salvador' },
  { id: 'ss-soyapango', departamentoId: 'ss', nombre: 'Soyapango' },
  { id: 'll-santa-tecla', departamentoId: 'la-libertad', nombre: 'Santa Tecla' },
]

export const SAMPLE_SUCURSALES: SucursalOption[] = [
  {
    id: 'fudem-ss',
    nombre: 'FUDEM San Salvador',
    direccion: 'Alameda Juan Pablo II, local 12, San Salvador',
    activa: true,
  },
  {
    id: 'fudem-sta',
    nombre: 'FUDEM Santa Tecla',
    direccion: 'Avenida Manuel Gallardo, centro comercial, Santa Tecla',
    activa: true,
  },
]

export type Product = {
  id: string
  name: string
  price: number
  compareAt?: number
  image: string
  onSale?: boolean
  outOfStock?: boolean
}

export const products: Product[] = [
  {
    id: 'aviador-classic',
    name: 'Aviador Classic',
    price: 89.0,
    compareAt: 110.0,
    image: '/catalog/aviador.svg',
    onSale: true,
  },
  {
    id: 'wayfarer-negro',
    name: 'Wayfarer Negro',
    price: 75.0,
    image: '/catalog/wayfarer.svg',
  },
  {
    id: 'redondo-carey',
    name: 'Redondo Carey',
    price: 68.5,
    image: '/catalog/redondo.svg',
  },
  {
    id: 'cat-eye-ambar',
    name: 'Cat-eye Ámbar',
    price: 82.0,
    compareAt: 95.0,
    image: '/catalog/cateye.svg',
    onSale: true,
  },
  {
    id: 'rectangular-azul',
    name: 'Rectangular Azul',
    price: 71.0,
    image: '/catalog/rectangular.svg',
  },
  {
    id: 'deportivo-verde',
    name: 'Deportivo Verde',
    price: 96.0,
    image: '/catalog/deportivo.svg',
    outOfStock: true,
  },
  {
    id: 'aviador-dorado',
    name: 'Aviador Dorado',
    price: 120.0,
    image: '/catalog/aviador.svg',
  },
  {
    id: 'wayfarer-mate',
    name: 'Wayfarer Mate',
    price: 64.0,
    compareAt: 79.0,
    image: '/catalog/wayfarer.svg',
    onSale: true,
  },
  {
    id: 'redondo-negro',
    name: 'Redondo Negro',
    price: 59.0,
    image: '/catalog/redondo.svg',
  },
]

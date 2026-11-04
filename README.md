# Probador virtual de lentes (FUDEM)

Tienda en línea para ver aros, probárselos con la cámara o con una foto, subir la receta, pagar y elegir si el pedido se envía a domicilio o se retira en sucursal. También se puede pedir una devolución de un pedido ya entregado.

La aplicación vive en `fudem-app`. Los datos (cuentas, productos, pedidos, recetas y sucursales) están en Supabase. Hay una versión publicada en [probadorvirtuallentes.vercel.app](https://probadorvirtuallentes.vercel.app/).

## Qué se puede hacer

Hay que registrarse e iniciar sesión. Después el recorrido es este:

1. Ver el catálogo y abrir la ficha de un aro (`/catalogo`).
2. Probar el aro de frente, con la cámara o con una foto (`/probador#<id>`).
3. Subir una receta (`/documentos`). Hace falta una receta recibida para pagar.
4. Pagar con tarjeta o dejar el pago para la tienda (`/pago#<id>`).
5. Elegir envío a domicilio o retiro en sucursal (`/entrega#<id del pedido>`).
6. Si el pedido ya figura como entregado, solicitar una devolución dentro de los 8 días (`/devoluciones`).

El probador solo coloca el lente de frente. Si la persona gira la cara, no se dibuja el aro. La detección del rostro se descarga al abrir el probador, así que esa pantalla necesita internet.

El pago no cobra de verdad: una pasarela simulada decide el resultado según el número de tarjeta.

## Probarlo publicado

Abre [https://probadorvirtuallentes.vercel.app/](https://probadorvirtuallentes.vercel.app/).

Usa una cuenta de prueba, no datos reales. Para llegar al pago, el aro tiene que estar disponible, tener precio y el cliente debe tener una receta ya recibida.

Tarjetas de la simulación (cualquier titular, un vencimiento futuro y un CVV de 3 dígitos):

| Número | Resultado |
| --- | --- |
| `4242 4242 4242 4242` | Pago aprobado |
| `4000 0000 0000 0002` | Tarjeta rechazada |
| `4000 0000 0000 9995` | Fondos insuficientes |
| `4000 0000 0000 0119` | El servicio de pago no responde |

Otro número que pase la validación de la tarjeta también se aprueba. El pedido solo guarda los últimos 4 dígitos.

## Probarlo en la computadora

Hace falta Node.js. Desde la carpeta `fudem-app`:

```bash
npm install
npm run dev
```

Vite abre la aplicación en local, normalmente en `http://localhost:5173`. Ahí la cámara también funciona.

En `fudem-app` tiene que existir un archivo `.env` con la URL y la clave publicable del proyecto de Supabase:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Sin esas dos variables la aplicación no puede iniciar sesión ni leer el catálogo. No hace falta una clave secreta en el navegador.

Para ver la versión ya compilada:

```bash
npm run build
npm run preview
```

## Pruebas automáticas

También dentro de `fudem-app`:

```bash
npm test
```

Eso corre Vitest (reglas de pago, entrega, devoluciones, probador y pantallas). No abre el sitio publicado ni usa la base de producción.

`npm run test:e2e` lanza Playwright, si el entorno ya tiene los navegadores de ese runner.

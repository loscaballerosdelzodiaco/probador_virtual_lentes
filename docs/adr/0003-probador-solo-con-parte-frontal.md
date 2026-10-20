# ADR 0003 · Probar los lentes solo sobre la parte frontal del rostro

Estado: Aceptada · 20 de octubre de 2026

## Contexto
El probador virtual debe ayudar al cliente a ver cómo le quedan los
lentes antes de comprarlos, ya sea con la cámara o con una fotografía.
Las imágenes de los modelos de neustro catálogo tienen fotos en frontal
y lateral. Sin embargo mostrar los lentes de perfil o girando con la cabeza requeriría
modelos en 3D de cada lente y una detección del rostro mucho más compleja.

## Decisión
El probador solo funciona con el rostro visto de frente. Detecta la
posición de los ojos y coloca sobre ellos la imagen frontal del lente.
No trabajamos con vistas de perfil ni con modelos en 3D.

## Consecuencias
+ Usamos las imágenes que el catálogo ya tiene, sin pedir material
  nuevo de cada modelo.
+ El probador es más sencillo de construir y de probar en el tiempo
  que tenemos.
+ Funciona de forma fluida en celulares y computadoras comunes.
+ Es más fácil explicarle al cliente cómo usarlo: mirar de frente a la
  cámara.
− Si el cliente gira la cabeza, el lente no se ve bien o el sistema no
  encuentra el rostro.
− No se pueden ver las patillas ni el ajuste en los lados de la cara,
  por lo que el probador es solo una referencia visual y no garantiza
  cómo calzará el lente.
− Si más adelante queremos una experiencia más realista, habrá que
  conseguir modelos en 3D y rehacer buena parte del probador.
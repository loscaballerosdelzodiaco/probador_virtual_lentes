# ADR 0002 · Programar la página en React

Estado: Aceptada · 20 de octubre de 2026

## Contexto
El proyecto comparté entre si diferentes partes: tarjetas de producto, formularios,
mensajes de error y botones. Cada pantalla cambia según lo que hace
la persona: el catálogo se actualiza al filtrar, el probador reacciona
a la cámara y el pago muestra distintos mensajes según el resultado.

## Decisión
Programamos la página en React. No la hacemos con HTML, CSS y
JavaScript sueltos.

## Consecuencias
+ Las piezas se hacen una vez y se reutilizan en todas las pantallas,
  lo que ahorra trabajo y mantiene el mismo aspecto.
+ Cada persona puede trabajar en piezas distintas, y hay menos choques
  al unir el trabajo.
+ Hay mucha ayuda disponible: documentación, ejemplos y herramientas
  ya hechas, incluidas las de cámara y detección de rostro.
+ La página se actualiza sola cuando cambian los datos, sin tener que
  repetir código para cada caso.
+ Funciona bien con Vercel, donde publicamos la página.
− Aunque trabajarlo con IA sea mucho más rápido, si no se entiende
  o no se tiene conocimiento de React es más complicado comprender
  que se está haciendo.
− Nos apoyamos en muchas herramientas externas que hay que mantener
  actualizadas.
− Para una página muy pequeña sería más trabajo del necesario, y
  dejarlo de usar más adelante implicaría reescribir mucho código.
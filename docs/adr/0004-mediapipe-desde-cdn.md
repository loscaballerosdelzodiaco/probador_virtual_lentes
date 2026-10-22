# ADR 0004 · Bajar la detección del rostro desde internet

Estado: Aceptada · 22 de octubre de 2026

## Contexto
El probador tiene que encontrar los ojos y comprobar que la persona
mira de frente (eso ya lo decidimos en el ADR 0003). En los sprints
2 y 3 usamos una herramienta de Google para llegar a la Review con
cámara y foto funcionando.

Guardar esa herramienta en nuestra página, publicarla y probarla nos
hubiera tomado más tiempo del que había antes de la Review. Por eso
la bajamos desde internet cuando alguien abre el probador.

En el taller de deuda técnica vimos que casi no tocamos esa parte
semana a semana. El costo aparece el día que esa descarga falle.
Moverla a nuestro lado son muchas horas para lo que queda de Sprint 4.

## Decisión
Seguimos bajando la detección del rostro desde internet en el Sprint 4
y en la semana de cierre. No la guardamos nosotros ahora.

Si un día deja de funcionar, el arreglo es copiarla a nuestro lado.
No rehacemos el probador por esto.

## Consecuencias
+ El probador llegó a las reviews a tiempo, sin un trabajo extra de
  guardar y publicar esa herramienta.
+ Si hay que cambiar de dónde se baja, se puede hacer sin rehacer
  cómo se colocan los lentes.
− Si esa página de internet falla, la cámara y la foto dejan de
  reconocer la cara.
− Dependemos de que Google no cambie la herramienta. Si la cambia,
  los lentes pueden quedar mal puestos.
− En la Feria dependemos de esa conexión, no solo de la nuestra.
− Quien abra esa parte del probador tiene que leer este ADR para no
  “arreglarlo” sin saber por qué está así.

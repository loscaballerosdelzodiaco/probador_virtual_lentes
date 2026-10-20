# ADR 0001 · Despliegue en Vercel en lugar de GitHub Pages

Estado: Aceptada · 20 de octubre de 2026

## Contexto
Para funcionar de manera correcta, necesita conectarse a una base de datos
con claves privadas, usar la cámara del dispositivo y, más adelante,
procesar pagos y pedidos. GitHub Pages solo muestra páginas fijas y estaticas:
si alguien recarga o abre un enlace directo a una sección, aparece un
error, y no permite ejecutar procesos del lado del servidor ni guardar
claves de forma segura

## Decisión
Desplegamos la aplicación en Vercel, conectada al repositorio de
GitHub. No usamos GitHub Pages.

## Consecuencias
+ Los enlaces y las recargas funcionan sin mostrar errores.
+ Cada cambio genera un enlace de prueba, así que el equipo puede
  revisarlo antes de publicarlo.
+ La página se actualiza sola cuando subimos cambios.
+ La conexión es segura, algo que el navegador exige para usar la
  cámara en el probador.
− Dependemos de una herramienta más y de una cuenta de Vercel; si
  quien la creó se va del proyecto, hay que pasar el acceso a otra
  persona.
− El plan gratuito tiene límites; si la página crece, quizá haya que
  pagar. Además, para previsualizar solo se puede con una persona extra
  externa a la de la cuenta principal.
− Si algún día queremos cambiar de plataforma, mover algunas partes
  nos dará trabajo extra.
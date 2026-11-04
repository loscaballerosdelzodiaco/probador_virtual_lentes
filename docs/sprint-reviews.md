# Actas de Sprint Review: Sprints 1 al 4
## Proyecto: Probador Virtual de Lentes FUDEM
**Equipo de Desarrollo**: Los Caballeros del Zodiaco  
**Scrum Master**: Katherine Cabezas (Sofi)  
**Product Owner**: Verónica Martínez  
**Fecha de Cierre**: 30 de octubre de 2026  

---

## Índice
1. [Sprint Review 1: Catálogo y Acceso de Clientes (05/10/2026 – 09/10/2026)](#1-sprint-review-1-catálogo-y-acceso-de-clientes-05102026--09102026)
2. [Sprint Review 2: Probador Virtual con Cámara y Foto (12/10/2026 – 16/10/2026)](#2-sprint-review-2-probador-virtual-con-cámara-y-foto-12102026--16102026)
3. [Sprint Review 3: Receta Médica, Pago y Decisiones de Arquitectura (19/10/2026 – 23/10/2026)](#3-sprint-review-3-receta-médica-pago-y-decisiones-de-arquitectura-19102026--23102026)
4. [Sprint Review 4: Entrega, Devoluciones, Deuda Técnica y Cierre (26/10/2026 – 30/10/2026)](#4-sprint-review-4-entrega-devoluciones-deuda-técnica-y-cierre-26102026--30102026)
5. [Evaluación Global del Equipo (Sprints 1–4)](#5-evaluación-global-del-equipo-sprints-14)

---

# 1. Sprint Review 1: Catálogo y Acceso de Clientes (05/10/2026 – 09/10/2026)

### 1.1 Ficha del Sprint
* **Sprint Goal**: Construir el esqueleto caminante del producto, desplegado en Vercel y conectado a Supabase, donde el cliente pueda explorar el catálogo de lentes, crear su cuenta e iniciar sesión.
* **Periodo de Ejecución**: Lunes 5 de octubre de 2026 a Viernes 9 de octubre de 2026.
* **Participantes y Roles**:
  * Verónica Martínez (*Product Owner · Developer*)
  * Katherine Cabezas · Sofi (*Scrum Master · Developer*)
  * Rodrigo López (*QA · Developer*)
  * Helen Quijada (*QA · Developer*)
  * Oscar Robles (*Developer · Pipeline y Despliegue*)
* **Métrica de Capacidad**:
  * **Story Points Planificados**: 5.5 SP (HU2: 3.5 · HU1: 2)
  * **Story Points Completados**: 5.5 SP
  * **Porcentaje de Cumplimiento**: 100.0%

---

### 1.2 Revisión del Incremento (Demo)
En la revisión con la Product Owner se presentaron los siguientes elementos funcionales:
1. **Catálogo de Lentes (HU2)**: Listado en tarjetas de los modelos disponibles consultados desde Supabase, vista de detalle con diseño y tipo de aro, filtros, mensaje de catálogo vacío y manejo de error cuando no carga.
2. **Registro de Clientes (HU1)**: Formulario *mobile first* con máscaras de DUI y teléfono, validaciones de campos y mensajes de error.
3. **Inicio de Sesión (HU1)**: Validación de credenciales y mensajes para datos incorrectos o campos vacíos.
4. **Despliegue en Vercel**: Aplicación publicada y conectada a la base de datos.

* **Evidencia en el Repositorio de Git**:
  * `2213242` (07-oct): *"Base para proyecto y conexión con supabase"* (Rodrigo).
  * `de1744d` (07-oct): *"Tarea 5 y Tarea 6 - HU2: Agregar vista de detalle e información adicional del producto"* (Oscar).
  * `7164d45` (08-oct): *"Tarea 7 — HU2: Implementar mensaje para catálogo vacío"* (Verónica).
  * `a7946e8` (08-oct): *"Merge pull request #1 from Catalogo"*.
  * `63a5535` (09-oct): *"Tarea 3 - HU1: Implementar el registro de nuevos usuarios"* (Katherine).
  * `362b758` (09-oct): *"Tarea 6 - HU1: Implementar el inicio de sesión y validación de credenciales"* (Helen).
  * `8489ecd` (09-oct): *"Merge pull request #7 from Sprint1"*.

---

### 1.3 Análisis y Reflexión del Equipo
* **Lo que funcionó bien**:
  * Entre todos decidimos hacer primero el catálogo y después el registro, porque el catálogo era lo que más valor le daba al cliente. Así, desde el miércoles ya teníamos algo que mostrar.
  * Separamos la HU1 en dos partes (registro e inicio de sesión), y así dos personas pudieron trabajar al mismo tiempo.
  * Terminamos todo lo que planeamos, aunque era nuestro primer sprint.
* **Dificultades y Retos Técnicos**:
  * Era la primera vez que trabajábamos así (con Scrum y de forma ágil) y nos sentimos un poco abrumados.
  * No teníamos claro cómo usar las ramas, y eso causó confusión y conflictos al juntar el código.
  * Tuvimos problemas para que la página publicada en Vercel se conectara con la base de datos, y eso atrasó el despliegue.

---

### 1.4 Acuerdos y Decisiones para el Sprint 2
1. **Una Rama por Historia**: Cada historia se trabaja en su propia rama y se junta con el resto por medio de un Pull Request. Nadie sube directo a `main`.
2. **Pruebas Automáticas desde el Inicio**: Dejar listas las pruebas automáticas desde el primer día, para encontrar los errores a tiempo y no al final.
3. **Viernes de Pruebas**: El último día del sprint se usa para probar todo, no para seguir programando.

---

# 2. Sprint Review 2: Probador Virtual con Cámara y Foto (12/10/2026 – 16/10/2026)

### 2.1 Ficha del Sprint
* **Sprint Goal**: Permitir que el cliente se pruebe virtualmente los lentes del catálogo con la cámara en tiempo real o con una fotografía, y descargue el resultado.
* **Periodo de Ejecución**: Lunes 12 de octubre de 2026 a Viernes 16 de octubre de 2026.
* **Métrica de Capacidad**:
  * **Story Points Planificados**: 13 SP (HU3)
  * **Story Points Completados**: 13 SP
  * **Porcentaje de Cumplimiento**: 100.0%

---

### 2.2 Revisión del Incremento (Demo)
1. **Probador con Cámara**: Captura de video en tiempo real con detección facial de MediaPipe; el lente se coloca sobre los ojos solo cuando el rostro está de frente.
2. **Probador con Foto**: Carga y validación de la imagen (formato, tamaño y rostro visible) con ajuste manual de posición, tamaño y rotación.
3. **Cambio de Modelo y Captura**: Cambio de lente sin salir del probador y descarga de la imagen del resultado.
4. **Pipeline en GitHub Actions**: Lint, build, pruebas unitarias con Vitest y pruebas E2E con Playwright en cada push y pull request.

* **Evidencia en el Repositorio de Git**:
  * `558d7b7` (12-oct): *"test: agregar pipeline de pruebas de integración y E2E"* (Oscar).
  * `716febe` (12-oct): *"Tarea 3 - HU3: cameraService y manejo de cámara no disponible"* (Helen).
  * `3a433b4` (13-oct): *"Tarea 5 - HU3: Integrar la librería de detección facial"* (Katherine).
  * `70f2005` (13-oct): *"Tarea 6 - HU3: Superponer el lente"* (Verónica).
  * `573f067` (14-oct): *"Tarea 11-12 - HU3: Servicio de modelos del probador y ancla del lente (WebP)"* (Oscar).
  * `206e42d` (14-oct): *"Tarea 14 - HU3: Implementar la captura y descarga de la imagen del resultado"* (Rodrigo).
  * `fed136e` (15-oct): *"Tarea 16 - HU3: Pruebas unitarias del probador virtual con Vitest"* (Rodrigo).
  * `88f9360` (15-oct): *"Merge pull request #10 from Sprint2"*.

---

### 2.3 Análisis y Reflexión del Equipo
* **Lo que funcionó bien**:
  * El probador era la historia más grande del ciclo. La dividimos en 16 tareas pequeñas, nos las repartimos entre los cinco y la terminamos un día antes.
  * Cuando alguien terminaba su tarea, avisaba al grupo para que el siguiente pudiera continuar.
  * Si encontrábamos un error en el trabajo de otro, se lo decíamos directamente a esa persona para que lo arreglara.
  * Seguimos dejando el viernes para pruebas, como acordamos en el Sprint 1.
* **Dificultades y Retos Técnicos**:
  * Lo más difícil fue detectar la cara y acomodar el lente: al principio quedaba chueco o de un tamaño que no era, y hubo que ajustarlo varias veces.
  * Las pruebas automáticas fallaban al subir el código, porque se estaban mezclando dos tipos de pruebas y había reglas del código que no se cumplían. Hubo que corregirlo antes de poder juntar el trabajo.

---

### 2.4 Acuerdos y Decisiones para el Sprint 3
1. **No Juntar Código con Pruebas Fallando**: Antes de subir algo, cada quien revisa en su computadora que las pruebas pasen.
2. **Equipos que se Revisan entre Sí**: Equipo A (Verónica, Rodrigo y Oscar) y Equipo B (Katherine y Helen). Cada historia la revisa el equipo que no la hizo.
3. **Avisar al Terminar**: Seguir avisando al grupo cada vez que una tarea queda lista, sobre todo si otra persona depende de ella.

---

# 3. Sprint Review 3: Receta Médica, Pago y Decisiones de Arquitectura (19/10/2026 – 23/10/2026)

### 3.1 Ficha del Sprint
* **Sprint Goal**: Permitir que el cliente suba su receta médica y compre sus lentes con tarjeta (pasarela simulada) o pagando en tienda, sin almacenar datos sensibles de la tarjeta.
* **Periodo de Ejecución**: Lunes 19 de octubre de 2026 a Viernes 23 de octubre de 2026.
* **Métrica de Capacidad**:
  * **Story Points Planificados**: 16 SP (HU4: 8 · HU5: 8)
  * **Story Points Completados**: 16 SP
  * **Porcentaje de Cumplimiento**: 100.0%

---

### 3.2 Revisión del Incremento (Demo)
1. **Carga de Receta (HU4)**: Subida de PDF o imagen a un bucket privado de Supabase Storage, confirmación de recepción y opción de volver a cargar.
2. **Validación en Dos Capas**: Formato, tamaño y calidad de imagen en el navegador, y una segunda validación en el servidor con la Edge Function `validar-documento`.
3. **Pago (HU5)**: Resumen del pedido, pago con tarjeta o en tienda, validación de tarjeta y pasarela simulada con aprobación, rechazo, fondos insuficientes y falla del servicio.
4. **Seguridad del Pedido**: Solo se guardan los últimos 4 dígitos de la tarjeta, el monto lo fija la base desde el catálogo y no se cobra dos veces.
5. **Decisiones de Arquitectura**: ADR 0001 a 0004 en `docs/adr/`.

* **Evidencia en el Repositorio de Git**:
  * `9accc16` (20-oct): *"ADRs"* (Rodrigo).
  * `8668ddb` (21-oct): *"Tarea 2 - HU4: Almacenamiento de archivos"* (Oscar).
  * `05581e9` (22-oct): *"ADR 4 - Trabajo Deuda Tecnica"* (Rodrigo).
  * `fac807f` (22-oct): *"Tarea 3 - HU5: Crear las tablas pedido y pago (sin guardar número completo ni CVV)"* (Katherine).
  * `90627d4` (23-oct): *"Tarea 5 - HU4: Confirmación de recepción"* (Verónica).
  * `3ed9118` (23-oct): *"Tarea 9 - HU5: evitar cobros duplicados y manejar la falla del servicio de pago (E3)"* (Helen).
  * `286dd82` (24-oct): *"Merge pull request #14 from Sprint3"*.

---

### 3.3 Análisis y Reflexión del Equipo
* **Lo que funcionó bien**:
  * Revisar el trabajo del otro equipo (A revisa a B y B revisa a A) sí nos ayudó a encontrar errores antes de juntar el código.
  * Las reglas importantes, como el precio, que el pedido sea del cliente y que tenga receta, las protegimos también en la base de datos, no solo en la pantalla.
  * Escribimos los ADR para dejar claro por qué tomamos ciertas decisiones.
* **Dificultades y Retos Técnicos**:
  * Por la carga de otras materias, dejamos la mayoría de las tareas para los últimos dos días.
  * Una de las pruebas falló al juntar las ramas de receta y pago, y hubo que arreglarla antes de unirlas.

---

### 3.4 Acuerdos y Decisiones para el Sprint 4
1. **Repartir el Trabajo en la Semana**: Desde el lunes definir qué tareas se terminan cada día, para no dejar todo para el final.
2. **Pagar la Deuda Técnica**: Hacer en el Sprint 4 las cuatro mejoras que salieron del taller de deuda técnica.
3. **Ponernos de Acuerdo en los Archivos Compartidos**: Cuando varias personas tienen que modificar el mismo archivo, decidir antes quién va primero, para no chocar.

---

# 4. Sprint Review 4: Entrega, Devoluciones, Deuda Técnica y Cierre (26/10/2026 – 30/10/2026)

### 4.1 Ficha del Sprint
* **Sprint Goal**: Completar la ruta del cliente después de la compra, eligiendo cómo recibe sus lentes y pudiendo solicitar una devolución, y pagar la deuda técnica priorizada en el taller.
* **Periodo de Ejecución**: Lunes 26 de octubre de 2026 a Viernes 30 de octubre de 2026 (Cierre).
* **Métrica de Capacidad**:
  * **Story Points Planificados**: 10 SP (HU6: 5 · HU7: 5) + 5.5 horas de deuda técnica
  * **Story Points Completados**: 10 SP + 5.5 horas de deuda técnica
  * **Porcentaje de Cumplimiento**: 100.0%

---

### 4.2 Revisión del Incremento (Demo)
1. **Forma de Entrega (HU6)**: Envío a domicilio con departamento, municipio y dirección, o retiro en una sucursal activa, con resumen conectado al pedido.
2. **Devoluciones (HU7)**: Solicitud sobre pedidos entregados dentro de 8 días, sin otra devolución activa, y consulta del estado; las reglas se validan en la pantalla y en la base de datos.
3. **Pago de Deuda Técnica**: Un solo lugar para identificar el lente, eliminación de la lista vieja y de funciones sin uso, separación del dibujo de los lentes y precio desde un solo sitio.

* **Evidencia en el Repositorio de Git**:
  * `47cd5b0` (26-oct): *"Tarea 3 - HU6: Carga de departamentos, municipios y sucursales activas"* (Rodrigo).
  * `439f8ba` (26-oct): *"Tarea 4 - HU6: Lógica para guardar la selección"* (Verónica).
  * `1af1690` (27-oct): *"Merge pull request #15 from Retiro"*.
  * `5da9876` (27-oct): *"Tarea 4 - HU7: Implementar la validación de condiciones de devolución"* (Katherine).
  * `009f87c` (27-oct): *"Tarea 6 - HU7: Implementar la consulta del estado de las solicitudes"* (Helen).
  * `f072be3` (29-oct): *"Tarea 4 - Deuda: Separar el dibujo de los lentes"* (Rodrigo).
  * `9595734` (29-oct): *"Tarea 3 - Deuda: Quitar las funciones sin uso"* (Oscar).
  * `c3ea1e1` (31-oct): *"Merge pull request #18 from Sprint4"*.

---

### 4.3 Análisis y Reflexión del Equipo
* **Lo que funcionó bien**:
  * Esta vez sí repartimos mejor el trabajo durante la semana, como acordamos en el Sprint 3.
  * Trabajamos entrega y devoluciones al mismo tiempo, cada una en su rama, sin estorbarnos.
  * Convertimos la deuda técnica en tareas claras, cada una con su responsable y su tiempo estimado.
  * Al final del ciclo aprendimos a trabajar en equipo, a exigirnos más y a cumplir con los tiempos. Fue difícil, pero lo logramos.
* **Dificultades y Retos Técnicos**:
  * Las reglas de devolución (solo pedidos entregados, máximo 8 días y una sola solicitud por pedido) tuvieron que funcionar igual en la pantalla y en la base de datos.
  * Dos personas crearon la tabla de sucursales por separado el mismo día, y hubo que unir las dos versiones.

---

### 4.4 Acuerdos Finales del Equipo
1. **Una Sola Tabla de Sucursales**: Dejar una sola versión para que la base de datos no falle si se crea desde cero.
2. **Guardar Toda la Base de Datos en el Repositorio**: Subir también las tablas de usuarios y productos, que se crearon a mano en Supabase.
3. **Vigilar la Detección de Rostro**: Si la herramienta que se descarga de internet deja de funcionar, copiarla al proyecto, como dice el ADR 0004.

---

# 5. Evaluación Global del Equipo (Sprints 1–4)

### 5.1 Evolución de la Velocidad del Equipo
| Sprint | Fechas | Enfoque Estratégico | SP Planificados | SP Completados | Efectividad | Velocidad Acumulada |
| :---: | :---: | :--- | :---: | :---: | :---: | :---: |
| **Sprint 1** | 05/10 – 09/10 | Catálogo y Acceso de Clientes | 5.5 SP | 5.5 SP | 100.0% | 5.5 SP |
| **Sprint 2** | 12/10 – 16/10 | Probador Virtual | 13 SP | 13 SP | 100.0% | 9.3 SP |
| **Sprint 3** | 19/10 – 23/10 | Receta, Pago y ADRs | 16 SP | 16 SP | 100.0% | 11.5 SP |
| **Sprint 4** | 26/10 – 30/10 | Entrega, Devoluciones y Deuda | 10 SP + 5.5 h | 10 SP + 5.5 h | 100.0% | 11.1 SP |
| **TOTAL** | **4 Semanas** | **Ruta Completa del Cliente** | **44.5 SP** | **44.5 SP** | **100.0%** | **Promedio: 11.1 SP** |

---

### 5.2 Cumplimiento de la Definición de Hecho (DoD)
Cada Historia de Usuario completada en los 4 sprints cumplió con:
1. **Código en su rama** con commits trazables en formato *"Tarea N - HUx: descripción"*.
2. **Pipeline en verde** en GitHub Actions: lint, build, pruebas con Vitest y pruebas E2E con Playwright.
3. **Revisión cruzada** por el equipo que no desarrolló la historia, contra sus criterios de aceptación.
4. **Integración por Pull Request** a la rama del sprint y después a `main`.

---
*Acta de Sprint Reviews del equipo Los Caballeros del Zodiaco, 30 de octubre de 2026.*

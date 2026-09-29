# MathPhysics — Android (Contenido Educativo, CONECTADO al backend real)

Kotlin + Jetpack Compose + Retrofit. Pantallas Mis Materias → Temas → Lección,
ahora consumiendo la API real en vez de datos fijos.

## ⚠️ Antes de correrlo: configura la IP en RetrofitClient.kt

Abre `data/remote/RetrofitClient.kt` y cambia `BASE_URL`:

- **Emulador de Android Studio**: `http://10.0.2.2:3000/`
- **Celular físico por WiFi**: `http://TU_IP_LOCAL:3000/` (ej. `http://192.168.1.45:3000/`)
  - Consigue tu IP local en Windows: PowerShell → `ipconfig` → "Dirección IPv4"
  - El celular y la computadora deben estar en la **misma red WiFi**
  - El backend debe estar corriendo (`npm start`) en ese momento
  - Si no conecta, revisa el Firewall de Windows (puede estar bloqueando el puerto 3000 para conexiones entrantes)

## ⚠️ Aviso — no lo pude compilar
Sigo sin Android SDK en mi entorno. Revisado a mano; si Android Studio marca
algún error, mándame el mensaje exacto.

## Cómo abrirlo
1. Levanta el backend primero (`npm start` en `mathphysics-backend`).
2. Edita `BASE_URL` en `RetrofitClient.kt` como se explica arriba.
3. Abre `mathphysics-android/` en Android Studio, sincroniza Gradle, corre (▶️).

## Qué cambió respecto a la versión sin conexión
- `ApiService.kt` / `RetrofitClient.kt` — de vuelta, apuntando a los endpoints reales.
- `ContenidoRepository` — ya no lee `SampleData`, llama a la API con `suspend fun`.
- Los 3 ViewModels — vuelven a usar `viewModelScope.launch` con manejo de
  errores de red (sin conexión, 404, etc.), mostrando el mensaje correspondiente
  en pantalla en vez de tronar.
- `AndroidManifest.xml` — permiso de Internet y `usesCleartextTraffic` de
  vuelta (el backend corre en HTTP simple para desarrollo local).
- Los modelos de datos (`Materia`, `Tema`, `Leccion`, `PasoEjemplo`) **no
  cambiaron** — ya coincidían exactamente con lo que regresa el backend.
- `data/sample/SampleData.kt` se queda en el proyecto sin usarse, por si
  quieres volver a la versión sin conexión más adelante (solo hay que
  regresar el repositorio a leer de ahí).

## Estructura
```
app/src/main/java/com/mathphysics/app/
├── data/
│   ├── model/          Materia, Tema, Leccion, PasoEjemplo
│   ├── remote/          ApiService (Retrofit) + RetrofitClient
│   ├── sample/          SampleData — ya no se usa, queda de respaldo
│   └── repository/     ContenidoRepository (ahora llama a la API real)
├── ui/
│   ├── theme/           Colores (misma paleta que Figma), tipografía
│   ├── components/      BottomNavBar
│   ├── viewmodel/       Un ViewModel por pantalla, con manejo de carga/error
│   └── screens/         MisMateriasScreen, TemasModuloScreen, LeccionScreen
├── navigation/          NavGraph: materias → temas/{id}/{nombre} → leccion/{id}
└── MainActivity.kt
```

## Módulo de Ejercicios (nuevo)

4 pantallas nuevas, con interacción local real (sin backend todavía):

- **EjercicioOpcionMultipleScreen** — seleccionar opción, confirmar, muestra +XP o la respuesta correcta.
- **EjercicioNumericoScreen** — campo de texto numérico, verifica contra la respuesta esperada.
- **SimulacionScreen** — 2 sliders (Voltaje, Resistencia) que calculan la corriente en vivo con la Ley de Ohm real (I = V/R), no es solo visual.
- **PasoAPasoScreen** — reordenar con flechas ↑↓ (no arrastre con el dedo — ese gesto es propenso a bugs sutiles que no puedo probar sin compilar; se puede agregar después con una librería como `sh.calvin.reorderable` si lo quieres).

Conectado desde el botón "Ir a ejercicios →" de la Lección, encadenado: Opción Múltiple → Numérico → Simulación → Paso a Paso → de regreso a Mis Materias.

Todos usan datos de ejemplo (`EjerciciosSampleData.kt`) — el enunciado de Ecuaciones Lineales y Teorema de Pitágoras coincide con los mockups que compartiste.

## Módulos nuevos: Racha, Recompensas, Insignias, Ranking, Repaso de Errores

Reconstruidos de memoria (no pude releer Figma, el límite de la API se agotó
casi de inmediato), a partir de lo que ya habíamos revisado juntos antes en
esta conversación. Pantallas:

- **RachaScreen** — sirve tanto para "racha activa" como "en riesgo" (parámetro `racha`), reutilizando un solo composable.
- **RecompensasScreen** — XP, nivel, progreso, bonificaciones, historial.
- **InsigniasScreen** — grid 2 columnas, desbloqueadas vs. bloqueadas, con enlace a Recompensas.
- **RankingScreen** — top jugadores + tu posición destacada aparte.
- **RepasoErroresScreen + ReintentoScreen** — lista de errores pendientes → reintentar (reutiliza el ejercicio de opción múltiple de ejemplo).

**La barra inferior ahora navega de verdad** (antes solo Inicio funcionaba) — Repaso, Logros y Ranking llevan a sus pantallas reales. "Ejer." lleva al ejercicio de opción múltiple de ejemplo. Técnicamente usa un `CompositionLocal` (`LocalNavController`) para no tener que pasarle el controller a cada pantalla individualmente.

## Pendiente — no tengo referencia visual confiable
- Pantalla 16 · Corrección Exitosa (la vi pero no estoy seguro de recordarla bien)
- Pantalla 24 · Bitácora (Admin)
- Pantallas 25-30 · las 6 simulaciones (Ley de Ohm, Voltaje, Resistencias en serie, 2da Ley de Newton, Energía, Teorema de Pitágoras)
- Admin: Dashboard y Crear Ejercicio los tengo de memoria pero no los construí todavía en este batch — quedan para la siguiente si me confirmas que la memoria que tengo de esas dos coincide con lo que esperas.

## Conectado al backend real (Ejercicios, Racha, Recompensas, Insignias, Repaso, Ranking)

**Cambio de arquitectura importante:** antes, Ejercicios era una cadena fija
de 4 pantallas de demostración (Opción Múltiple → Numérico → Simulación →
Paso a Paso). Ahora que se conecta a datos reales, un subtema puede tener 1,
2 o ningún ejercicio, de cualquier tipo — así que se reemplazó por:

- `EjerciciosFlowScreen` — pantalla contenedora única que pide la lista real
  de ejercicios de un subtema y va mostrando el tipo correcto uno por uno.
- `ui/exercises/` — 4 "contenidos" (`OpcionMultipleContent`, `NumericoContent`,
  `SimulacionContent`, `PasoAPasoContent`) sin Scaffold propio, reutilizados
  tanto por el flujo normal como por Reintento.

**Usuario de prueba:** en `data/remote/Config.kt` — cámbialo por un usuario
real de tu base antes de probar (`SELECT id, nombre_usuario FROM usuarios;`).

**"Ejer." en la barra inferior** apunta por ahora al subtema 2 (Ecuaciones
lineales) como demo, porque los ejercicios ya no tienen una pantalla "de
inicio" propia — siempre se llega desde una Lección o desde Repaso.

## Pequeños cambios de backend que acompañaron esta conexión
- La Lección ahora regresa `subtemaId` (para saber qué ejercicios pedir después).
- Nuevo endpoint `GET /api/ejercicios/:id` (un solo ejercicio, para Reintento).
- `/api/repaso` ahora regresa `respuestaResumen` (texto legible) en vez del JSON crudo de la respuesta.

Todo esto ya está en el backend que te acabo de compartir — no necesitas hacer nada extra en la base de datos por estos 3 cambios.

## Fix: Ranking/Recompensas/Insignias/Repaso/Racha no se actualizaban sin reiniciar la app

Causa: los ViewModels solo cargaban datos una vez, en `init {}`. Como Compose
+ Navigation reutiliza el mismo ViewModel al volver a una pantalla ya
visitada (por el `restoreState = true` de la barra inferior), nunca se
volvía a pedir la info al backend.

Fix: `ui/components/OnResumeEffect.kt` — un efecto que corre cada vez que la
pantalla vuelve a quedar visible (ON_RESUME del lifecycle), no solo la
primera vez. Se conectó en las 5 pantallas de progreso, cada una llamando a
su `viewModel.cargar()`. Ahora responder un ejercicio y luego entrar a
Ranking/Recompensas/Insignias/Repaso siempre trae los datos actualizados,
sin necesidad de cerrar la app.

## Bono de XP por velocidad (Propuesta4.docx)

Cada pantalla de ejercicio ahora mide cuánto tarda el estudiante desde que
aparece hasta que confirma (`System.currentTimeMillis()`), y lo manda como
`tiempo_segundos` al backend. Si la respuesta es correcta y rápida, el
backend regresa `bonoVelocidad > 1` y se muestra junto al XP ganado (ej.
"+23 XP ⚡ ×1.5").

## Fix: no se podía escribir signo negativo en Ejercicio Numérico

El teclado decimal de Android no trae tecla de signo negativo por defecto
(limitación del sistema). Se agregó un botón "±" a la izquierda del campo
que invierte el signo del valor escrito.

## Fix: Reintentar daba "HTTP 404 Not Found" en pantalla

Mensaje crudo de Retrofit en vez de un error legible. Ahora ReintentoViewModel
distingue el 404 específicamente y muestra un mensaje claro. La causa real
(el ejercicio se desactivaba solo) se arregló en el backend — esto es
protección extra por si vuelve a pasar algo similar.

## Sección de Ejercicios separada de Inicio/Lección

- **EjerciciosDisponiblesScreen** (nueva) — lista los temas con ejercicios
  disponibles, cada uno con su materia. Es la nueva pantalla de entrada de
  la pestaña "Ejer." (antes iba directo y fijo al subtema de Ecuaciones
  Lineales como demo).
- El botón "Ir a ejercicios" de la Lección se queda igual — sigue siendo un
  atajo directo desde la teoría, ahora conviviendo con la sección propia.
- Al terminar un lote de 10 ejercicios, regresa a este selector en vez de a
  Mis Materias, para quedarse dentro de la sección de Ejercicios.

## Fix: progreso siempre en 0% + XP infinito

- **Materias/Temas** ahora piden el progreso real (mandan `usuario_id`
  automáticamente) y se refrescan solos al volver a esas pantallas (mismo
  patrón `OnResumeEffect` que ya usábamos en Racha/Ranking).
- Las 4 pantallas de ejercicio muestran un mensaje claro ("Ya dominas este
  tema — sin XP extra") en vez de un confuso "+0 XP" cuando el backend
  indica que el subtema ya se dominó.

## Fix: el botón de regresar del celular volvía a los ejercicios ya hechos

Causa: al terminar un lote de ejercicios, intentaba limpiar la pila de
navegación hasta "Ejercicios Disponibles" — pero si entraste por el botón
"Ir a ejercicios" de la Lección (no por la pestaña "Ejer."), esa pantalla
nunca estuvo en la pila, así que no se limpiaba nada. Ahora limpia hasta el
Inicio (`Mis Materias`) sin importar por dónde hayas entrado — el botón de
regresar del sistema ya no debería volver a llevarte al ejercicio recién
terminado.

## Splash screen con fondo teal (como en Figma)

- `androidx.core:core-splashscreen` agregado — fondo teal (#14A8B0) + el
  logo del gato, siguiendo el patrón oficial de Android (funciona en todas
  las versiones, no solo Android 12+).
- `MainActivity.onCreate()` ahora llama `installSplashScreen()` antes de
  `super.onCreate()`.

## Tarjetas de Materias rediseñadas — mascota real por materia

Las tarjetas de "Mis Materias" ahora son mucho más grandes y usan las
ilustraciones que armaste (el mismo gato del logo, rodeado de elementos de
cada materia — figuras geométricas y fórmulas para Matemáticas; átomo,
sistema solar y prisma para Física). La info dinámica (temas · subtemas y
la barra de progreso) queda en una franja con degradado sobre la parte
inferior de la imagen, para que siga siendo legible sin tapar la
ilustración.

Los intentos con SVG dibujado a mano y con Canva genérico no se parecían a
la mascota real — la solución fue usar directamente la imagen que
compartiste (ya tenía al gato correcto con collar, cola enroscada y ojos
verdes) y solo dividirla en dos.

## Rediseño minimalista de Mis Materias

Cambios respecto a la versión anterior:
- **Header**: quitó el bloque sólido teal — ahora es fondo blanco, título
  en texto oscuro, subtítulo en gris. El ícono de racha pasó de una
  "píldora" con fondo a un simple ícono de flama sin decoración.
- **Tarjetas**: quitó el degradado oscuro sobre la imagen — la ilustración
  ahora se ve limpia, sin overlay. El nombre, "temas · subtemas" y la barra
  de progreso bajaron a una zona blanca simple debajo de la imagen.
- **Barra de progreso**: mucho más delgada (3dp en vez de 6dp), gris claro
  neutro en vez de blanco translúcido, con el % en gris en vez de color
  fuerte — deja que el teal de la barra sea el único acento de color ahí.
- Menos bordes, menos sombras, más espacio en blanco entre elementos.

## Modo oscuro/claro + imágenes de materia más chicas

**Modo oscuro**: `ui/theme/AppTheme.kt` — un estado global reactivo
(`AppTheme.modoOscuro`). Los tokens de color (`Teal`, `Fondo`,
`TextoPrimario`, etc. en `Color.kt`) pasaron de ser `val`s fijos a
propiedades calculadas que leen ese estado — así TODAS las pantallas que ya
usaban esos nombres se adaptan solas al modo oscuro, sin tener que tocarlas
una por una. Se agregó un token nuevo, `Superficie` (blanco en claro, gris
oscuro en oscuro), y se corrigieron los 3 lugares que usaban blanco fijo
como fondo de tarjeta en vez del token.

El botón para cambiar de modo (ícono de sol/luna) está en el header de Mis
Materias, junto al de racha. Por ahora el modo se resetea al cerrar la
app (no se guarda todavía) — si quieres que se recuerde entre sesiones,
dime y le agrego almacenamiento local.

**Imágenes más chicas**: las tarjetas de materia pasaron de una imagen
grande de ancho completo a una miniatura de 76dp junto al texto (nombre,
temas/subtemas, progreso), en vez de la imagen como protagonista de toda la
tarjeta.

## Fix: texto invisible en modo oscuro (cajas de fórmula)

Encontré 6 lugares que usaban colores grises/rojos claros **fijos** (no
tokens de tema) para fondos — al activar el modo oscuro, el texto claro
quedaba invisible sobre esos fondos que seguían siendo claros. Eran las
cajas de fórmula (Lección, Paso a Paso), la insignia bloqueada, y los
indicadores de respuesta incorrecta.

Se agregaron 2 tokens nuevos a la paleta: `SuperficieNeutra` (las cajas
grises) y `ErrorBg` (los indicadores rojos de error) — ambos con su versión
oscura correspondiente. Los 6 lugares ya usan estos tokens en vez del color
fijo.

## Imágenes de materia: ajuste de tamaño

Quedaron en 108dp (antes 76dp, que resultó muy chico) — un punto medio
entre la versión original (imagen ocupando toda la tarjeta) y la que quedó
muy pequeña.

## Fix: la app se refrescaba sola "cada cierto tiempo"

Causa real: `LocalLifecycleOwner` dentro de una pantalla de Navigation-Compose
sigue el ciclo de vida de la Activity completa — bloquear el celular,
deslizar la barra de notificaciones, o cambiar de app un segundo, dispara
ON_RESUME igual que si hubieras navegado de regreso a la pantalla, aunque
nunca la hayas dejado dentro de la app. Por eso se sentía como que se
refrescaba sola sin razón aparente.

Fix: `OnResumeEffect` ahora exige que pasen al menos 3 segundos desde el
último refresco antes de volver a llamar la función — filtra esas pausas
del sistema sin afectar el refresco real cuando sí vuelves a una pantalla
después de un rato.

## Imágenes de materia: de vuelta al formato apilado

Imagen arriba (ancho completo, 180dp de alto — más grande que la miniatura
pero bastante menos que la primera versión que ocupaba casi toda la
pantalla), con el nombre, "temas · subtemas" y la barra de progreso debajo,
como pediste.

## Nueva pantalla: Subtemas — selector entre Temas y Lección

Arregla la limitación de que solo se veía la primera teoría de cada
módulo. Flujo nuevo:

Materias → Temas (módulos) → **Subtemas (nuevo)** → Lección

- `SubtemasScreen.kt` (nueva) + `SubtemasViewModel.kt` — mismo patrón visual
  que la pantalla de Temas, con su propia barra de progreso por subtema.
- `LeccionScreen`/`LeccionViewModel` ahora reciben `subtemaId` en vez de
  `temaId` — piden la lección de ESE subtema específico, no "la primera
  del módulo".
- El botón "Ir a ejercicios" sigue funcionando igual (usa el `subtemaId`
  que ya regresa la lección).

## Acceso remoto vía ngrok (sin necesidad de la misma red WiFi)

`RetrofitClient.kt` ahora incluye un interceptor que agrega el header
`ngrok-skip-browser-warning` a cada llamada — necesario porque el plan
gratis de ngrok muestra una página de aviso HTML en vez de la respuesta
real la primera vez, y eso rompería todas las llamadas de la app sin este
header.

**Importante**: el link gratuito de ngrok cambia cada vez que reinicias el
túnel (`ngrok http 3000`). Cada vez que lo hagas, hay que actualizar
`BASE_URL` en `RetrofitClient.kt` con el nuevo link y volver a compilar.

## Contenido teórico ampliado: ahora sí se muestra

Se agregó el campo `cuerpo` al modelo `Leccion` y a la pantalla — antes el
backend nunca lo mandaba, así que aunque existiera en la base de datos,
nunca se veía en la app. Ahora aparece como párrafo de texto justo debajo
del recuadro de definición, antes de la fórmula.

## Lección ahora es un carrusel de páginas (secciones)

Rediseño de `LeccionScreen.kt`: en vez de mostrar toda la explicación y
ambos ejemplos en un solo scroll largo, ahora muestra UNA sección a la vez
(su explicación + su propio "Ejemplo resuelto"), con botones "← Anterior" /
"Siguiente →" para navegar. En la última sección, "Siguiente" se convierte
en "Ir a ejercicios →".

La definición y la fórmula se quedan visibles en todas las páginas (como
referencia constante); lo que cambia entre páginas es la explicación y el
ejemplo. Un indicador "1 / 2" muestra en qué página vas.

Modelo `Leccion` cambió: `cuerpo` + `pasos` (planos) se reemplazaron por
`secciones: List<Seccion>`, donde cada `Seccion` tiene su propia
`explicacion` y sus propios `pasos`.

## Nueva pantalla: Preguntas Teóricas (RQF26)

`PreguntasTeoricasScreen.kt` (nueva) + `PreguntasTeoricasViewModel.kt` —
mismo patrón visual que los ejercicios de opción múltiple, pero conectado
al sistema nuevo de preguntas teóricas, separado de la práctica generada.

**Cambio de navegación importante**: "Ir a ejercicios" en `LeccionScreen`
ya NO navega a `ejercicios/{subtemaId}` — ahora navega a
`preguntas_teoricas/{subtemaId}`. Al terminar todas las preguntas de esa
lección, el botón "Volver a Subtemas" regresa directo a la pantalla de
Subtemas (no continúa a la práctica generada).

La práctica generada sigue intacta y accesible — solo cambió de dónde se
llega a ella: ahora es exclusivamente vía la pestaña "Ejer." de abajo, no
desde el flujo de una lección.

## Renderizado real de LaTeX (RQNF10) — antes era texto plano con símbolos

Nuevo: `ui/components/FormulaLatex.kt` — un WebView con la librería KaTeX
(vía CDN), que muestra fórmulas de verdad (fracciones apiladas,
exponentes como superíndice, símbolo de raíz con la barra extendida),
no una aproximación con texto Unicode. Se autoajusta de alto según el
contenido real.

Reemplazó el `Text()` plano que mostraba la fórmula en `LeccionScreen` y
en `PreguntasTeoricasScreen`.

**Requiere internet** la primera vez que carga KaTeX desde su CDN
(cdn.jsdelivr.net) — como ya necesitas internet para el backend vía
ngrok, no debería ser un problema adicional.

## Las 6 simulaciones reales — SimulacionContent reescrito por completo

La versión anterior solo sabía dibujar Ley de Ohm con 2 sliders libres, y
usaba un modelo (`Map<String, Double>`) incompatible con la nueva
estructura del backend (`fijos`/`incognita`/`objetivo`/`opciones`/`rango`)
— esto hubiera hecho crash en cualquier simulación nueva.

Corregido de raíz:
- `ExerciseModels.kt`: nuevo `ValoresInicialesSimulacion` + `RangoSimulacion`,
  tipados correctamente contra la forma real del JSON (verificado contra el
  backend en vivo para los 6 tipos, no adivinado).
- `SimulacionContent.kt` reescrito por completo: un despachador + 6
  pantallas, cada una con su propio diagrama dibujado en Canvas (circuito
  con batería y resistencia en zigzag, bloque con flecha de fuerza,
  objeto a una altura, triángulo rectángulo, baterías/resistencias en
  serie) y su control correspondiente — slider continuo para valores como
  fuerza/altura/cateto, o selector con flechas para valores discretos
  exactos (E12, baterías), nunca un valor inválido.
- Cada pantalla muestra el valor actual en vivo contra el objetivo, con
  indicador visual (verde) cuando está cerca.
- El envío ahora manda `{"valor": ...}` (el valor real que dejó el
  estudiante en la incógnita), coincidiendo con cómo el backend califica
  — antes mandaba `valor_alcanzado` con la lectura calculada, que ya no
  aplica al formato de objetivo.

**Encontré y corregí de nuevo el bug del ENUM** (`tipo_simulacion`) en tu
base de datos — tu export no tenía la corrección aplicada, así que fallaba
con "Data truncated" al generar las simulaciones nuevas. Ya corregido.

Probado de punta a punta: los 6 tipos generan, muestran el JSON esperado
exacto, y califican bien tanto la respuesta correcta como una claramente
incorrecta.

## Fix: ejercicios ya no disponibles se seguían mostrando

Encontré la causa: el backend SÍ rechazaba correctamente (404) intentar
responder un ejercicio desactivado, pero `EjerciciosFlowViewModel` no
distinguía ese caso — mostraba un error genérico y dejaba el ejercicio
"muerto" en pantalla, sin ofrecer salida. Ahora, si pasa esto, se pide
automáticamente un lote fresco en vez de dejar al usuario atorado.

`ReintentoScreen` ya manejaba esto bien — el problema estaba solo en el
flujo principal de práctica.

## Simulaciones: arrastre real para valores discretos (RQF13/RQNF18)

Releí la Propuesta4 y los Requerimientos con cuidado — RQF13 pide
explícitamente "simulaciones de arrastrar elementos", y RQNF18 exige que
el resultado se recalcule en vivo *mientras* se arrastra, antes de soltar.

- Los controles continuos (fuerza, altura, cateto) ya cumplían esto — el
  Slider de Compose arrastra de verdad y recalcula en cada frame.
- Los discretos (resistencia E12, baterías) usaban botones de flecha
  ◀▶, que NO es arrastrar. Los cambié a un Slider real que se desliza
  con el dedo, pero solo puede quedar en uno de los valores exactos de la
  lista (nunca un valor inválido) — mapea la posición del arrastre a un
  índice de la lista, no a un número libre.

## Simulaciones más parecidas a Tinkercad (pulido visual)

No viene explícito en los requerimientos, pero pediste que se acercaran
más a la sensación de Tinkercad. Cambios en los 3 diagramas de
electrónica (Ley de Ohm, Voltaje en serie, Resistencias en serie):

- **Bandas de color reales en las resistencias** — no son decorativas: se
  calculan a partir del valor real en ohms (2 cifras significativas +
  multiplicador), igual que en un componente físico. Validé que las 25
  bandas posibles de tu serie E12 se reconstruyen exactas antes de
  escribir el código de dibujo.
- **Batería con forma física** (cuerpo redondeado + terminal dorado) en
  vez del símbolo esquemático de 2 líneas.
- **Cuadrícula de puntos tipo protoboard** de fondo en los 3 circuitos.
- **Cableado con esquinas redondeadas** en el circuito de Ley de Ohm, en
  vez de un rectángulo con esquinas cuadradas.

Las simulaciones de física (Newton, Energía, Pitágoras) se quedaron
como estaban — Tinkercad es específico de electrónica, no aplica ahí de
la misma forma.

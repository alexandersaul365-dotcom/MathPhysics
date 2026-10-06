# MathPhysics — Backend (Módulo de Autenticación)

Node.js + Express + MySQL. Implementa RQF1-5 y RQNF1-7 del documento de requerimientos.

## Instalación

```bash
npm install
cp .env.example .env
```

Edita `.env` con los datos de tu base de datos. **No uses el usuario `root` del backend** — crea un usuario dedicado con `db/create_app_user.sql` (está en la entrega de la base de datos) y usa esas credenciales aquí.

## Correr

```bash
npm start
```

Por defecto queda en `http://localhost:3000`.

## Endpoints — Autenticación

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/registro` | No | RQF1 — crea cuenta (usuario 4-20 car., password 8-64 car.) |
| POST | `/api/auth/login` | No | RQF2-3 — login; bloquea 15 min tras 5 fallos consecutivos |
| POST | `/api/auth/logout` | Bearer token | RQF4 — invalida solo esa sesión |
| GET | `/api/auth/perfil` | Bearer token | Ruta protegida de ejemplo, útil para probar el middleware |

## Endpoints — Contenido Educativo

Sin autenticación por ahora (el login se integra al final del proyecto, como pediste).

Ajustado para calzar exacto con el flujo real de Android/Figma: Mis Materias → Temas → Lección.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/contenido/materias` | 2 materias con conteos reales de temas/subtemas. `progreso` queda en 0 hasta que existan Ejercicios + Auth |
| GET | `/api/contenido/temas?materia=matematicas\|fisica` | Lista plana de temas de esa materia |
| GET | `/api/contenido/temas/:temaId/leccion` | Lección (definición + fórmula + pasos de ejemplo) del primer subtema publicado bajo ese tema |

**Nota sobre el modelo de datos:** lo que Figma llama "tema" en esta pantalla corresponde a la tabla `modulos` de la BD (Álgebra, Ecuaciones, etc.), no a la tabla `temas`. Las tablas `temas`/`subtemas` siguen existiendo para la jerarquía más granular de RQF6-8, pero esta pantalla en particular navega directo de tema → lección, mostrando el contenido del primer subtema publicado. Si más adelante quieres exponer esa jerarquía completa (elegir subtema específico), es un endpoint adicional, no un cambio estructural.

**Nota sobre los conteos:** los números que viste en el mockup (24/20 subtemas) eran contenido de ejemplo del diseño — la API regresa los conteos reales de lo que existe en la base de datos, que van a crecer conforme se cargue contenido real por el panel de Admin.

## Qué ya probé en vivo — Autenticación

Levanté el servidor contra una base MySQL real y confirmé:

- Registro exitoso → `201`
- Registro con usuario repetido → `409`
- Registro con usuario de 2 caracteres → `400`
- Login correcto → `200` + JWT válido
- Ruta protegida con token → `200`
- Ruta protegida sin token → `401`
- Logout → `200`, y ese mismo token usado después → `401` (queda invalidado de inmediato)
- **5 intentos fallidos seguidos → el 5to responde `423` con `minutos_restantes: 15`, y ni con la contraseña correcta deja entrar hasta que pase el bloqueo** (RQF3)

## Qué ya probé en vivo — Contenido Educativo

- Listar todos los módulos → `200` (10 módulos: 5 Mate + 5 Física)
- Listar módulos filtrados por materia → `200`
- Temas de un módulo → `200`
- Módulo inexistente → `404`
- Subtemas de un tema → `200`
- Lección publicada → `200` con título, cuerpo, LaTeX e imágenes
- **Lección en estado borrador → `404`** (RQNF43: el backend nunca expone contenido sin publicar)

## Notas de diseño

- El JWT nunca se guarda en texto plano en la base — se guarda su hash SHA-256 en `sesiones_jwt`. Así, borrar esa fila en logout invalida el token de inmediato sin tener que esperar a que expire.
- Si el usuario es `admin`, cada request autenticado revisa `ultima_actividad` en `sesiones_jwt` y expira la sesión pasados 30 min de inactividad (RQNF35), actualizando el timestamp en cada petición válida.
- Las contraseñas se hashean con bcrypt (10 rondas). Nunca se devuelve `password_hash` en ninguna respuesta.
- No hay endpoint de recuperación de contraseña — es una decisión de diseño ya tomada (ver DER v4): si el usuario la olvida, crea cuenta nueva.

## Siguiente paso sugerido
Módulo de Ejercicios (RQF9-15) — es el que más depende del Contenido Educativo, así que sigue naturalmente. El login se deja para el final, como se acordó.

## Endpoints — Ejercicios (el motor)

Sin autenticación todavía — recibe `usuario_id` en el body/params como usuario de prueba fijo (se conectará al login real al final).

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/ejercicios/subtema/:subtemaId` | Ejercicios publicados de ese subtema, con el detalle propio de cada tipo. Nunca incluye la respuesta correcta. Opciones y pasos vienen en orden aleatorio (RQNF12). |
| POST | `/api/ejercicios/:ejercicioId/responder` | Body: `{ usuario_id, respuesta }`. Evalúa, actualiza racha/XP/historial/repaso/insignias en cascada, y regresa si fue correcta. |

Forma de `respuesta` según el tipo:
- `opcion_multiple`: `{ "opcion_id": 2 }`
- `numerico` / `variable`: `{ "valor": 5 }`
- `simulacion`: `{ "valor_alcanzado": 0.26 }` (siempre se marca correcta — es exploratorio, RQF13)
- `paso_a_paso`: `{ "orden": [1,2,3,4] }` (ids de `ejercicio_pasos` en el orden que armó el usuario)

## Endpoints — Progreso (Racha, Recompensas, Insignias, Repaso, Ranking)

| Método | Ruta | RQF |
|---|---|---|
| GET | `/api/racha/:usuarioId` | RQF18-19 |
| GET | `/api/recompensas/:usuarioId` | RQF20-22 |
| GET | `/api/insignias/:usuarioId` | RQF22 |
| GET | `/api/repaso/:usuarioId` | RQF16-17 |
| GET | `/api/ranking` | RQF23-24 (top 10, sin filtrar por usuario) |

## Qué ya probé en vivo — Ejercicios y Progreso

- Listar ejercicios por subtema (opción múltiple, numérico, simulación, paso a paso) → cada uno con su detalle correcto, sin filtrar la respuesta.
- Responder opción múltiple correcta → `+10 XP`, racha en 1 día, insignia "primera_respuesta" se desbloquea sola.
- Responder numérico incorrecto → `0 XP`, aparece en `/api/repaso`.
- Responder ese mismo numérico correcto después → **desaparece de `/api/repaso` automáticamente** (RQF17).
- Responder simulación → siempre correcta, `+30 XP`.
- Responder paso a paso con el orden equivocado → `0 XP`, regresa el orden correcto, aparece en repaso.
- Ejercicio inexistente → `404`.
- `/api/recompensas` refleja el total exacto (60 XP), nivel y XP restante calculados correctamente.
- `/api/ranking` refleja la posición real según XP acumulado.

## Insignias — cobertura parcial (a propósito)

Implementé evaluación automática para 3 de las 6: `primera_respuesta`, `racha_fuego` (≥7 días), `sin_errores` (últimas 10 respuestas correctas). Las otras 3 (`maestro_tema`, `velocista`, `explorador`) necesitan lógica de seguimiento por sesión/cobertura de subtemas que no existe todavía — quedan pendientes para cuando eso se construya.

## Multiplicador de racha (RQNF30)
Implementado en `utils/progreso.js`: ×1.5 a partir de 3 días, ×2 a partir de 7, ×3 a partir de 30. Se aplica automáticamente al XP otorgado en cada respuesta correcta.

## Niveles (RQF20)
Tabla fija en `utils/progreso.js` (Novato/Aprendiz/Practicante/Explorador/Estratega/Maestro con umbrales de XP). Si quieres nombres o umbrales distintos, es un solo array para editar.

## Siguiente paso sugerido
Con esto, las pantallas de Android de Racha/Recompensas/Insignias/Repaso/Ranking (que hoy usan datos de ejemplo fijos) ya se pueden conectar a datos reales. El login sigue quedando para el final, como acordamos.

## Generadores algorítmicos (Propuesta4.docx, Versión 3)

Nuevo endpoint que genera un ejercicio con parámetros aleatorios, lo guarda
en la base ANTES de mostrarlo (RQNF16), y usa el mismo `/responder` que ya
existía sin ningún cambio.

| Método | Ruta | Body |
|---|---|---|
| POST | `/api/ejercicios/generar` | `{ "subtema_id": 2 }` |

**3 generadores implementados** (`src/generators/index.js`), mapeados por subtema_id:
- **2 — Ecuaciones lineales** (`ax + b = c`): `a` nunca es 0 (valida solvencia), ~30% de las variaciones piden solución fraccionaria, el resto entera.
- **6 — Teorema de Pitágoras**: calcula hipotenusa o un cateto; 60% usa ternas pitagóricas (respuesta exacta), 40% catetos aleatorios (respuesta con raíz, redondeada a 2 decimales).
- **12 — Ley de Ohm** (`V = I × R`): usa voltajes de batería reales (1.5/3/6/9/12/24V) y la serie comercial E12 de resistencias (10–1000Ω), calcula V, I o R al azar.

**Validado matemáticamente**: generé y verifiqué 60 ejercicios (20 por generador) comparando la `respuesta_correcta` contra el cálculo independiente — ver `ejemplos_generados.md`. Cero errores reales (un caso marcado como "error" en la primera corrida fue solo la tolerancia de mi script de prueba, no del generador).

**Cambio relacionado**: subí la tolerancia de comparación numérica en `/responder` de 0.01 a 0.05, para admitir el redondeo legítimo de valores intermedios (ej. cuando la corriente se redondea a 4 decimales antes de mostrarse).

## Pendiente
Quedan ~15 subtemas más con generador propio según Propuesta4.docx (álgebra: términos semejantes, polinomios, factorización; sistemas de ecuaciones; movimiento; Newton; energía; etc.) — este primer lote (3) valida que la arquitectura funciona de punta a punta antes de escalar a los demás.

## Fix: la lista de ejercicios generados crecía sin fin

Encontrado al probar: cada vez que alguien entraba a un subtema con
generador, el ejercicio anterior seguía apareciendo en la lista además del
nuevo. Dos causas, ambas corregidas:

1. Faltaba una forma de distinguir "generado automáticamente" de "creado a
   mano" → migración `migracion_ejercicios_generados.sql` (agrega
   `es_generado` a `ejercicios`).
2. Bug de orden: el código generaba el ejercicio nuevo *después* de leer la
   lista, así que el que se acababa de desactivar ya había sido leído como
   activo. Se invirtió el orden (generar primero, leer la lista después).

Probado con 4 visitas seguidas al mismo subtema: el conteo total se mantiene
igual cada vez, solo cambia cuál es el ejercicio generado más reciente.

**Android no necesita ningún cambio** — el modelo `Ejercicio` ya coincide
exactamente con la forma de los ejercicios generados.

## Cambios grandes: teoría completa, 10 ejercicios por lote, bono de velocidad

Siguiendo Propuesta4.docx al pie de la letra:

1. **Ejercicios fijos eliminados** de los subtemas 2, 6, 12 (`eliminar_ejercicios_fijos.sql`) — desactivados, no borrados (por la llave foránea con `respuestas_usuario` de tus pruebas). Para el estudiante es como si no existieran.
2. **Teoría completa** para los 3 (`completar_teoria_3_subtemas.sql`) — Pitágoras le faltaban definición y pasos; Ley de Ohm no tenía lección, se creó desde cero.
3. **Lote de 10 en vez de 1**: `GET /api/ejercicios/subtema/:id` ahora genera y regresa exactamente 10 ejercicios para estos 3 subtemas, reemplazando el lote anterior completo cada vez que se visita (probado con 2 visitas seguidas: siempre 10, nunca se acumula).
4. **Bono de XP por velocidad** (Propuesta4: "Entre menor sea el tiempo mayor será la bonificación de experiencia"): nuevo campo opcional `tiempo_segundos` en `/responder`. ≤10s → ×1.5, ≤20s → ×1.25, ≤30s → ×1.1, más de eso → sin bono. Se combina con el multiplicador de racha (RQNF30). Si no se manda `tiempo_segundos` (compatibilidad), no hay bono, sin errores.

## Instalar (en este orden)
```
migracion_ejercicios_generados.sql   (si no lo habías corrido)
eliminar_ejercicios_fijos.sql
completar_teoria_3_subtemas.sql
```
Luego reemplaza el backend y reinicia.

## Fix: Reintentar un ejercicio fallado daba 404

Causa: al generar un lote nuevo de 10, se desactivaba TODO lo generado
antes — incluyendo el ejercicio que seguía pendiente en el repaso de errores
de algún usuario. Ahora la desactivación excluye cualquier ejercicio que
tenga una fila activa en `errores_pendientes`. Probado: fallar un ejercicio
a propósito, generar un lote nuevo, y confirmar que el fallado sigue
existiendo y es reintentable (antes daba 404, ahora 200).

## Más tipos de ejercicio por generador algorítmico (siguiendo Propuesta4.docx al pie de la letra)

Antes, los 3 generadores solo producían ejercicios de tipo "numérico" (llenar
la respuesta). Ahora cada uno produce los formatos que la propuesta pide
específicamente para ese subtema:

- **Ecuaciones lineales** (subtema 2): alterna entre **numérico** ("resolver")
  y **paso a paso** ("resolución de ecuaciones paso a paso") — son los 2
  formatos que lista la propuesta para este subtema. Los pasos siguen la
  taxonomía exacta de RQNF22 (mover constantes → simplificar → despejar la
  variable = 3 pasos, para ecuaciones de un término a un lado).
- **Teorema de Pitágoras** (subtema 6): se queda en **numérico únicamente**
  — la propuesta no pide otro formato para este subtema específico, así que
  no le inventé ninguno.
- **Ley de Ohm** (subtema 12): alterna entre **numérico**, **opción
  múltiple** (con 3 distractores generados automáticamente) y
  **simulación** — los 3 formatos que pide la propuesta ("opción múltiple,
  cálculo numérico, simulación con arrastrar circuito").

## Dos correcciones encontradas al revisar RQNF21/RQNF30 a fondo

1. **XP por tipo** (RQNF21) ahora es exacto: 10 (opción múltiple), 20
   (numérico/variable), 30 (simulación/paso a paso). Antes Ecuaciones
   Lineales usaba 15 por error.
2. **Multiplicador de racha** (RQNF30): el requerimiento dice que el bono
   aplica *solo el día exacto* (3, 7 o 30), no de ahí en adelante como yo
   lo tenía. Ya corregido — probado: racha en día 2 correctamente no aplica
   ningún bono de racha.

## Pendiente (lo encontré al revisar, pero no lo pediste todavía)

RQNF30 también define bonos de finalización que no están implementados:
+50 XP al completar el último ejercicio pendiente de un subtema, +150 XP al
completar el último subtema pendiente de un tema. Necesitan rastrear
"cobertura completa", que no existe todavía con el sistema de lotes
rotativos de 10. Te aviso por si lo quieres para después.

## Sección de Ejercicios independiente de Lección

Nuevo endpoint que alimenta una pantalla propia en Android:

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/ejercicios/disponibles` | Lista los subtemas que tienen ejercicios (los que tienen generador algorítmico), con su tema y materia |

Antes, la única forma de llegar a Ejercicios era Materias → Tema → Lección →
"Ir a ejercicios". Ahora la pestaña "Ejer." de la barra inferior lleva
directo a elegir qué tema practicar, sin pasar por la teoría — quedan
separados, como pediste. El acceso desde Lección se queda igual, como un
atajo adicional.

## Fix: la racha no se reiniciaba si solo abrías la pantalla (sin practicar)

Causa real: la corrección de racha (romperla si pasaron 2+ días sin
practicar) solo vivía dentro de `/responder` — es decir, solo se corregía
la PRÓXIMA vez que respondías algo. Si solo abrías la app y mirabas la
pantalla de Racha sin practicar, veías el número viejo congelado para
siempre.

Fix: nueva función compartida `obtenerEstadoRacha()` en `utils/progreso.js`
que calcula el estado real (y corrige la base de datos si ya se rompió) —
ahora la usan tanto `/responder` como `GET /api/racha/:id` y
`GET /api/recompensas/:id` (este último también inflaba el bono de racha
mostrado con el número viejo).

Probado: racha de 6 días con última actividad hace 4 días → **con solo
consultar** `/racha` (sin responder nada) pasa a 0, corregido también en la
base de datos, y Recompensas deja de mostrar el bono inflado.

## Nuevo generador: Álgebra / Expresiones algebraicas y operaciones (subtema 1)

Los 4 algoritmos que pide Propuesta4.docx para este subtema, todos
mezclados aleatoriamente en el mismo lote:

- **Términos semejantes** (simplificar) — 3 variaciones: simples (2x+3x),
  mixtas (2x+3y+x), con negativos (5x−2x). Opción múltiple.
- **Operaciones con polinomios** (suma, resta, multiplicación básica) —
  opción múltiple, con distractores basados en errores algebraicos reales
  (mezclar signos, no distribuir, restar al revés).
- **Factorización / factor común** — 3 variaciones (ax+ay, 3x+6, 2xy+4y).
  Opción múltiple.
- **Sustitución en fórmulas** (a²+b², (a+b)², perímetro con 2 variables) —
  numérico puro, el único de los 4 que pide un número como respuesta.

XP: 10 para los de opción múltiple simples, 20 para multiplicación de
polinomios y sustitución (siguen siendo numérico/variable según RQNF21).

**Encontré y corregí un bug de variedad durante las pruebas**: a veces
salían solo 2-3 opciones en vez de 4 (cuando dos distractores coincidían
por casualidad con números pequeños). Agregué una malla de seguridad que
garantiza 4 opciones siempre — probado con 2000 generaciones sin una sola
falla.

## Cobertura hasta ahora
4 subtemas con generador algorítmico: Expresiones algebraicas (1),
Ecuaciones lineales (2), Teorema de Pitágoras (6), Ley de Ohm (12). Quedan
~16 subtemas más de Propuesta4.docx (ecuaciones con paréntesis, sistemas de
ecuaciones, trigonometría, movimiento, Leyes de Newton, energía, etc.) —
sigo con el siguiente bloque cuando me digas.

## 2 nuevos generadores: Ecuaciones con paréntesis y Sistemas de Ecuaciones

Estos 2 subtemas no existían todavía en la base — el módulo "Sistemas de
Ecuaciones" existía pero estaba vacío. Se creó su tema/subtema y su teoría
completa (`crear_subtemas_ecuaciones_avanzadas.sql`).

- **Ecuaciones con paréntesis** (subtema 13) — `a(x+b)=c` o `a(x+b)+d=e`.
  Alterna numérico y paso a paso. El paso a paso usa **6 pasos** (no 3),
  siguiendo RQNF22 al pie de la letra: "ecuaciones que requieren
  distribución generan 6 pasos" — distribuir, mover constante, simplificar,
  despejar, verificar.
- **Sistemas de dos ecuaciones** (subtema 14) — genera 2 ecuaciones lineales
  con 2 incógnitas, validando que el determinante nunca sea 0 (si no, las
  rectas serían paralelas y no habría solución única — RQNF16). Pide x o y
  al azar. Menciona el método sugerido (sustitución/igualación/reducción)
  en el enunciado.

Validado con 800 verificaciones matemáticas independientes (500 + 300) — 0
errores. El sistema se verificó con la regla de Cramer, calculada aparte del
generador, para confirmar que no hay sesgo en la propia validación.

## Cobertura hasta ahora: 6 de ~20 subtemas
Expresiones algebraicas, Ecuaciones lineales, Ecuaciones con paréntesis,
Sistemas de ecuaciones, Teorema de Pitágoras, Ley de Ohm.

## Fix grande: XP infinito + progreso siempre en 0%

Dos problemas reales que reportaste, ambos del mismo origen: no existía
ningún concepto de "ya dominaste este subtema".

1. **Progreso real** (RQF20-22): `GET /api/contenido/materias` y `GET
   /api/contenido/temas` ahora aceptan `?usuario_id=` y calculan el % real,
   promediando el progreso de los subtemas que tienen generador (los que
   todavía no tienen ejercicios no cuentan ni a favor ni en contra).
2. **Tope de XP**: nueva constante `UMBRAL_DOMINIO_SUBTEMA = 10` — una vez
   que respondiste correctamente 10 ejercicios de un subtema (acumulado,
   no por lote), seguir practicando ese subtema ya no otorga XP. La
   respuesta se sigue calificando normal (correcta/incorrecta, se sigue
   actualizando la racha), solo el XP se limita. `/responder` ahora regresa
   `subtema_dominado: true/false`.

Probado en vivo: respondí Pitágoras hasta cruzar el umbral — dejó de dar XP
exactamente en la respuesta #10, y el progreso de Matemáticas subió de 0%
a 36% reflejando el avance real.

## Android
No hace falta nada especial de tu parte — ya está todo conectado
(`Config.USUARIO_PRUEBA_ID` se manda automáticamente).

## 3 nuevos generadores: Área, Perímetro, Trigonometría

Trigonometría no existía (módulo vacío) — se creó su tema/subtema con
teoría completa (`crear_subtema_trigonometria.sql`).

- **Área** (subtema 4) — cuadrado, rectángulo, triángulo. Unidades reales
  (cm²/m²/km²) y valores enteros o decimales, tal como pide el documento.
- **Perímetro** (subtema 5) — mismas 3 figuras. Los triángulos validan la
  **desigualdad triangular** antes de generarse (nota explícita del
  documento) — nunca se genera un triángulo imposible.
- **Trigonometría** (subtema 15, nuevo) — seno/coseno/tangente en un
  triángulo rectángulo, con ternas pitagóricas (valores exactos) o catetos
  aleatorios (valores decimales).

Validado con **1500 verificaciones matemáticas independientes** (500 por
generador) recalculando cada resultado desde cero — 0 errores. Perímetro
también verificó por separado que cada triángulo generado cumple la
desigualdad triangular.

## Cobertura: 9 de ~20 subtemas
Expresiones algebraicas, Ecuaciones lineales, Ecuaciones con paréntesis,
Sistemas de ecuaciones, Áreas, Perímetros, Teorema de Pitágoras,
Trigonometría, Ley de Ohm. Sigue Física: Movimiento, Leyes de Newton,
Trabajo y Energía, y el resto de Electricidad Básica.

## 5 nuevos generadores: Física (Movimiento, Newton, Energía)

"Movimiento" no existía (módulo vacío) — se creó su tema/subtema
(`crear_subtema_movimiento.sql`).

- **Distancia y desplazamiento** (subtema 17, nuevo) — movimiento uniforme
  (calcula distancia, velocidad o tiempo) y con cambio de dirección
  (desplazamiento neto).
- **Velocidad** (subtema 7) — v = d/t.
- **Aceleración** (subtema 8) — a = (vf−vi)/t.
- **Fuerza** (subtema 9) — alterna 2da Ley de Newton (F=ma, con los rangos
  EXACTOS de la propuesta: masa 1–100 kg, aceleración 0.5–10 m/s² en pasos
  de 0.5) y 3ra Ley (acción-reacción, opción múltiple con 4 contextos
  distintos).
- **Energía** (subtema 11) — alterna cinética (Ec=½mv²) y potencial
  (Ep=mgh, g=9.8 m/s²).

**Encontré y corregí un detalle de realismo durante las pruebas**: algunos
ejemplos de velocidad salían en "km/s" (matemáticamente válido pero una
velocidad absurda para un problema típico) — restringido a unidades
realistas.

Validado con 2000+ verificaciones matemáticas independientes — 0 errores,
incluyendo verificación explícita de que masa/aceleración de Newton nunca
se salen de los rangos exactos que pide el documento.

## Cobertura: 14 de ~20 subtemas
Falta: el resto de Electricidad Básica (introducción a Ley de Ohm,
equivalencias de unidades, relación resistencia-corriente), y Trabajo
(que es puramente conceptual, no lleva generador).

## Ajuste de rangos según Requerimientos V5 (RQNF19)

Recuperé la base de datos y el proyecto después de un reinicio de mi
entorno de trabajo — todo tu progreso, subtemas y respuestas históricas
siguen intactos (los restauré desde tu export).

Encontré un desfase que corregí: el subtema "Distancia y desplazamiento"
tiene id **16** en tu base real, pero el código apuntaba al 17 — ya
corregido (antes esa práctica no aparecía en la lista de "disponibles").

Con el documento V5 que me diste (con las anotaciones en verde/amarillo),
alineé 3 generadores a los rangos EXACTOS de RQNF19 (antes usaba rangos
propios, ahora coinciden con el documento al pie de la letra):
- **Velocidad**: distancia 1-500m, tiempo 1-60s (antes usaba rangos distintos)
- **Aceleración**: ahora genera la aceleración directamente en 0.5-10 m/s²
  (pasos de 0.5) y deriva las velocidades, en vez de al revés — coincide
  exacto con el rango que pide el documento
- **Distancia/Desplazamiento**: velocidad 1-100 m/s, tiempo 1-60s

Verificado: 500 generaciones por cada uno, 0 errores matemáticos, 0 casos
fuera de rango.

El voltaje de Ley de Ohm ya estaba correcto (1.5/3/6/12V, sin el 9V que
pensé que tenía).

## Nuevo generador: Trabajo (subtema 10)

Encontré una discrepancia entre documentos: Propuesta4.docx marcaba
"Trabajo" como conceptual (sin generador), pero **RQF12 de Requerimientos
V5 (verde, aprobado) lo pide explícitamente** en la lista de temas de
física con ejercicios numéricos ("velocidad, fuerza, trabajo, energía y
voltaje"). Como V5 es el documento de requerimientos formal, seguí esa
indicación.

- Teoría nueva (`crear_teoria_trabajo.sql`) — no existía.
- Generador W = F × d, rotando cuál valor pide (trabajo, fuerza o
  distancia) — mismo patrón que Aceleración/Fuerza.
- Validado con 500 verificaciones matemáticas independientes, 0 errores.

## Simulaciones nuevas — construidas pero NO activadas todavía

Por instrucción tuya, dejé las 5 simulaciones de RQNF41c-g (Newton,
Energía, Pitágoras, Voltaje en serie, Resistencias en serie) para el
final. Ya empecé la de Newton (`generarSegundaLeyNewtonSimulacion`, en el
código pero sin registrar) — la retomo cuando me digas.

## Cobertura: 15 de ~20 subtemas
Expresiones algebraicas, Ecuaciones lineales, Ecuaciones con paréntesis,
Sistemas de ecuaciones, Áreas, Perímetros, Pitágoras, Trigonometría,
Distancia/Desplazamiento, Velocidad, Aceleración, Fuerza, **Trabajo (nuevo)**,
Energía, Voltaje.

## Último generador: Ecuaciones Cuadráticas (subtema 3) — cobertura completa

Con este, **los 16 subtemas de tu base de datos ya tienen generador
algorítmico**.

- Teoría nueva (`crear_teoria_ecuaciones_cuadraticas.sql`) — no existía.
- Se construye desde las raíces hacia atrás (a(x−r1)(x−r2)), lo que
  garantiza por construcción que el discriminante nunca sea negativo ni
  irracional — siempre hay solución real y limpia.
- **Numérico**: pide la raíz mayor o menor (bien definida, sin ambigüedad
  — no tiene sentido pedir "la respuesta" cuando hay dos).
- **Opción múltiple**: muestra el par completo de soluciones, con
  distractores de errores típicos (signo invertido, raíz doble incorrecta,
  raíces desplazadas).

Validado con 1000 verificaciones matemáticas independientes, incluyendo
confirmar que el discriminante nunca es negativo y que la raíz devuelta
realmente satisface la ecuación original (sustituyendo y comprobando
residuo ≈ 0) — 0 errores.

## Cobertura: 16 de 16 subtemas ✅

Todo lo que tiene generador algorítmico en tu base de datos actual está
cubierto. Pendiente: las 5 simulaciones de RQNF41c-g (Newton, Energía,
Pitágoras, Voltaje en serie, Resistencias en serie) que dejamos para el
final.

## Selector de subtemas — arregla que solo se viera 1 lección por módulo

Antes, la pantalla de Lección siempre mostraba el PRIMER subtema publicado
de un módulo (ej. Geometría siempre mostraba Pitágoras, nunca Áreas ni
Perímetros, aunque ambos ya tenían teoría). Ahora hay un paso intermedio.

Nuevos endpoints:

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/contenido/temas/:temaId/subtemas` | Lista los subtemas de un tema, cada uno con su progreso real (`?usuario_id=`) |
| GET | `/api/contenido/subtemas/:subtemaId/leccion` | La lección de un subtema específico (antes solo existía a nivel tema) |

La ruta vieja (`/api/contenido/temas/:temaId/leccion`, que muestra "el
primero") se dejó intacta por compatibilidad, pero Android ya no la usa.

Probado en vivo: Geometría ahora expone Áreas, Perímetros Y Pitágoras por
separado, cada uno con su propia teoría.

## Contenido teórico ampliado (16 subtemas)

Cada lección ahora tiene mucho más contenido: errores comunes, casos
especiales, atajos, y un **segundo ejemplo resuelto** distinto al primero
(`ampliar_teoria_16_subtemas.sql`). El cuerpo pasó de 1-2 líneas a
500-1000 caracteres en cada subtema.

**Encontré y corregí un problema real mientras probaba**: el campo
`cuerpo` de la lección nunca se mandaba al cliente — ni siquiera antes de
esta ampliación. Los dos endpoints de lección (`/subtemas/:id/leccion` y
la ruta vieja `/temas/:id/leccion`) solo mandaban `definicion` (corta).
Ya corregido en ambos.

## Lecciones divididas en secciones (páginas)

Reestructuración grande: cada lección ahora tiene 2 secciones, cada una con
su propia explicación Y su propio ejemplo resuelto — en vez de un bloque
largo con toda la explicación junta y luego los 2 ejemplos pegados uno tras
otro.

- Tabla nueva `contenido_secciones` (explicación por página).
- `contenido_pasos_ejemplo` ahora tiene `seccion_id` — cada paso pertenece
  a una sección específica, no a la lección completa.
- `GET /api/contenido/subtemas/:id/leccion` cambió de forma: ya no regresa
  `cuerpo` + `pasos` planos, ahora regresa `secciones: [{explicacion,
  pasos}]`.
- La ruta vieja de compatibilidad (`/temas/:id/leccion`) se quedó con la
  forma anterior — no se tocó.

Migración: `reestructurar_lecciones_en_secciones.sql`. Verificado: las 16
lecciones quedaron con exactamente 2 secciones, sin ningún paso huérfano,
y sin texto "Ejemplo 2 —" colgante (ya no hace falta esa etiqueta, cada
sección es su propio ejemplo).

## Simulaciones rediseñadas: de "explorar libre" a "objetivo a lograr"

Cambio grande en las 6 simulaciones (Ley de Ohm, Segunda Ley de Newton,
Energía potencial, Pitágoras, Voltaje en serie, Resistencias en serie):
ya no es "mueve los sliders y siempre está bien" — ahora cada una da 2
valores fijos y un OBJETIVO a lograr, y el estudiante ajusta el valor
faltante hasta acercarse al resultado correcto.

Ejemplo: "Ajusta la resistencia para que la corriente sea 0.25 A" (con el
voltaje ya fijo) — antes cualquier resistencia contaba como correcta.

**Bug real corregido**: la calificación de simulaciones literalmente
siempre regresaba `correcta: true`, sin importar qué respondieras. Ya
compara contra `resultado_esperado` con tolerancia, igual que los
ejercicios numéricos.

**Nuevas 4 simulaciones** (antes solo existía Ley de Ohm):
- Segunda Ley de Newton (masa fija, ajustar fuerza → aceleración objetivo)
- Energía potencial (masa fija, ajustar altura → energía objetivo)
- Pitágoras (un cateto fijo, ajustar el otro → hipotenusa objetivo)
- Voltaje en serie (baterías fijas, agregar la última → voltaje total objetivo)
- Resistencias en serie (resistencias fijas, agregar la última → resistencia total objetivo)

**Bug de esquema encontrado y corregido**: la columna `tipo_simulacion` era
un ENUM con nombres viejos que no coincidían con los que usan los
generadores reales — insertar cualquier simulación nueva fallaba con
"Data truncated". Corregido en `ampliar_tipo_simulacion.sql`.

Validado: 300+ generaciones por cada una de las 6 (0 errores matemáticos),
más pruebas en vivo end-to-end confirmando que valores correctos e
incorrectos se califican bien.

**Importante**: Android todavía no sabe dibujar estas 6 formas (solo tiene
la pantalla vieja de Ley de Ohm con 2 sliders). Ese es el siguiente paso.

## Preguntas Teóricas (RQF26) — sistema nuevo, separado de la práctica generada

Encontraste algo real: "Ir a ejercicios" desde la Lección seguía mandando
al pool de ejercicios generados, cuando RQF26 (V6, verde) define un tipo
de contenido distinto — preguntas de comprensión sobre la teoría, escritas
a mano por el administrador, NO calculadas algorítmicamente.

Por instrucción tuya: **ahora "Ir a ejercicios" desde la Lección lleva a
estas preguntas teóricas, no a la práctica generada.** La práctica
generada se queda solo en la pestaña "Ejer." — sigue existiendo para XP y
ranking, pero ya no es lo primero que ves después de una lección.

**Nuevas tablas**: `preguntas_teoricas`, `pregunta_teorica_opciones`,
`respuestas_pregunta_teorica` (separada de `respuestas_usuario`, para no
mezclar los dos sistemas).

RQF26 no especifica cómo se califican (a diferencia de RQF27, que sí pide
opciones de respuesta) — se extendió con opción múltiple de 4 opciones,
la única forma razonable de dar XP objetivamente. XP fijo de 15 por
respuesta correcta (sin bono de racha/velocidad — es un check de
comprensión, no práctica de cálculo).

**Contenido**: 1 pregunta por cada uno de los 16 subtemas, enfocada en
CONCEPTO (no cálculo, eso ya lo cubre la práctica generada) —
`preguntas_teoricas_muestra.sql` (2) + `preguntas_teoricas_restantes.sql`
(14).

Nuevos endpoints:
- `GET /api/preguntas-teoricas/subtema/:subtemaId`
- `POST /api/preguntas-teoricas/:preguntaId/responder`

## LaTeX real (RQNF10, RQNF36c) — antes era solo texto con símbolos Unicode

Encontraste algo real: nunca había implementado LaTeX de verdad, solo
símbolos Unicode (×, √, ±) como aproximación visual. Ahora sí:

- **`katex` (npm) instalado** — `utils/latex.js` compila/valida cada
  fórmula, tal como pide RQNF36c ("el servidor Node.js debe compilarlas
  usando la librería KaTeX antes de guardar. Si se detecta un error se
  rechaza la operación").
- **Las 16 fórmulas de lección se reescribieron a LaTeX real**
  (`convertir_formulas_a_latex.sql`) — validadas leyendo directo de la
  base de datos después de aplicar la migración, 0 errores.
- **Nuevo endpoint `POST /api/preguntas-teoricas`** — antes no existía
  ningún camino de código que aplicara RQNF36/36c (todo se insertaba por
  SQL directo). Este sí valida título, cuerpo, y LaTeX real — probado con
  una fórmula válida (se crea) y una inválida (`\frac{1}{` sin cerrar,
  se rechaza con el error real de KaTeX).

**Encontré y corregí un bug propio en el camino**: mi primer intento de
generar el SQL de conversión, usando un heredoc de bash, terminó
duplicando las barras invertidas (4 en vez de 2) sin que el validador lo
notara al inicio, porque `\\` en LaTeX es "salto de línea" válido — solo
se veía mal, no daba error de sintaxis. Lo detecté verificando byte por
byte antes de aplicar el cambio, y lo reescribí evitando heredocs.

---

## Panel de administrador (RQF25-36) y rutas protegidas

**Migración (una sola vez, en phpMyAdmin):** `src/migrations/panel_admin.sql` agrega `ejercicios.fecha_publicacion`.

**Todas las rutas de estudiante** ahora exigen `Authorization: Bearer <token>`; el servidor toma la identidad del JWT (si el `usuario_id` de la URL no coincide con el del token → 403).

**API `/api/admin/*`** (exige sesión + rol admin, RQNF34; sesión admin expira a los 30 min de inactividad, RQNF35):

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/perfil`, `/catalogo` | Datos del admin y permisos; árbol materia→tema→subtema |
| GET/POST | `/preguntas-teoricas` | Listar / crear (borrador) |
| GET/PUT/DELETE | `/preguntas-teoricas/:id` | Ver / editar / baja lógica |
| POST | `/preguntas-teoricas/:id/publicar` | Publica y registra `fecha_publicacion` |
| GET/POST | `/ejercicios` | Listar / crear (`opcion_multiple`, `numerico`, `variable`, `simulacion`) |
| GET/PUT/DELETE | `/ejercicios/:id` | Ver / editar / baja lógica (paso a paso: no editable) |
| POST | `/ejercicios/paso-a-paso/previsualizar` | `{ecuacion}` → 3-6 pasos generados (422 si supera 6) |
| POST | `/ejercicios/paso-a-paso` | `{subtema_id, ecuacion}` → confirma; el servidor regenera los pasos y guarda borrador |
| POST | `/ejercicios/:id/publicar` | Publica |
| GET/POST | `/contenido` | Versiones de contenido teórico por subtema (version incremental, borrador, imágenes base64 JPG/PNG ≤2 MB, máx. 3) |
| POST/DELETE | `/contenido/:id/publicar`, `/contenido/:id` | Publicar / baja lógica |
| GET | `/bitacora` | Bitácora (usuario, acción, contenido, fecha UTC-6). Se escribe en la misma transacción que la operación (RQNF46) |
| GET | `/reportes/temas`, `/reportes/estudiantes`, `/reportes/estudiantes/:id` | Reportes con SQL agregado; requieren permiso `ver_reportes` (RQNF48) |

Simulaciones (`valores` por tipo): `ley_ohm {voltaje, resistencia}`, `segunda_ley_newton {masa, fuerza}`, `energia_potencial {masa, altura}`, `pitagoras {cateto_a, cateto_b}`, `voltaje_serie {baterias:[…]}`, `resistencias_serie {resistencias:[…]}`. El resultado esperado se calcula en el servidor.

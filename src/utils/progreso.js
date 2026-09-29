// RQF20: niveles con nombre, calculados a partir del XP total.
const NIVELES = [
  { nivel: 1, nombre: 'Novato', minXp: 0 },
  { nivel: 2, nombre: 'Aprendiz', minXp: 300 },
  { nivel: 3, nombre: 'Practicante', minXp: 700 },
  { nivel: 4, nombre: 'Explorador', minXp: 1000 },
  { nivel: 5, nombre: 'Estratega', minXp: 1500 },
  { nivel: 6, nombre: 'Maestro', minXp: 2200 },
];

function calcularNivel(xpTotal) {
  let actual = NIVELES[0];
  for (const n of NIVELES) {
    if (xpTotal >= n.minXp) actual = n;
  }
  const idx = NIVELES.indexOf(actual);
  const siguiente = NIVELES[idx + 1];

  return {
    nivel: actual.nivel,
    nombreNivel: actual.nombre,
    xpRestante: siguiente ? siguiente.minXp - xpTotal : 0,
    progresoNivel: siguiente
      ? (xpTotal - actual.minXp) / (siguiente.minXp - actual.minXp)
      : 1,
  };
}

// RQNF30: el multiplicador se activa SOLO el día exacto (3, 7 o 30), no de
// ahí en adelante — "no se acumulan; se aplica únicamente el mayor activo".
function multiplicadorRacha(diasConsecutivos) {
  if (diasConsecutivos === 30) return 3;
  if (diasConsecutivos === 7) return 2;
  if (diasConsecutivos === 3) return 1.5;
  return 1;
}

function multiplicadorVelocidad(segundos) {
  if (segundos === undefined || segundos === null || Number.isNaN(segundos)) return 1;
  if (segundos <= 10) return 1.5;
  if (segundos <= 20) return 1.25;
  if (segundos <= 30) return 1.1;
  return 1;
}

// RQNF30/RQF18-19: calcula el estado REAL de la racha de un usuario. Si
// pasaron 2+ días sin practicar, la racha ya se rompió — se corrige en la
// base de datos aquí mismo, en vez de esperar a que el usuario vuelva a
// responder un ejercicio (así no se queda "congelada" en pantalla).
async function obtenerEstadoRacha(pool, usuarioId) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [[racha]] = await pool.query(
    'SELECT dias_consecutivos, ultima_actividad FROM rachas WHERE usuario_id = ?',
    [usuarioId]
  );

  if (!racha) {
    return { dias: 0, enRiesgo: false, practicoHoy: false };
  }

  if (racha.ultima_actividad === hoy) {
    return { dias: racha.dias_consecutivos, enRiesgo: false, practicoHoy: true };
  }

  const diffDias = Math.round((new Date(hoy) - new Date(racha.ultima_actividad)) / 86400000);

  if (diffDias === 1) {
    // Practicó ayer, hoy todavía no: la racha sigue viva pero en riesgo.
    return { dias: racha.dias_consecutivos, enRiesgo: true, practicoHoy: false };
  }

  // 2+ días sin practicar: la racha ya se rompió. Se corrige en la BD.
  if (racha.dias_consecutivos !== 0) {
    await pool.query('UPDATE rachas SET dias_consecutivos = 0 WHERE usuario_id = ?', [usuarioId]);
  }
  return { dias: 0, enRiesgo: false, practicoHoy: false };
}

// NOTA: el pool de ejercicios generados (numérico/opción múltiple/simulación/
// paso a paso) existe para ganar XP de cara al ranking (RQF20-22) y SIEMPRE
// otorga XP cuando la respuesta es correcta — no tiene tope de "dominio".
// El único concepto de "ya dominas este tema" es el de las preguntas
// teóricas fijas (RQF26), abajo — esas sí son un checklist finito por
// subtema y alimentan la barra de progreso, nunca los ejercicios generados.

// Cuántas preguntas teóricas (RQF26) tiene publicadas un subtema — la barra
// de progreso de ese subtema es sobre este total, no sobre los ejercicios
// generados (esos son un sistema aparte, solo para XP/ranking).
async function totalTeoricasPublicadas(pool, subtemaId) {
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM preguntas_teoricas
     WHERE subtema_id = ? AND estado = 'publicado' AND activo = TRUE`,
    [subtemaId]
  );
  return Number(total);
}

// Cuántas preguntas teóricas DISTINTAS ha respondido bien un usuario en un
// subtema (si reintenta una y la vuelve a acertar, no cuenta dos veces).
async function contarTeoricasCorrectasSubtema(pool, usuarioId, subtemaId) {
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(DISTINCT rpt.pregunta_id) AS total
     FROM respuestas_pregunta_teorica rpt
     JOIN preguntas_teoricas pt ON pt.id = rpt.pregunta_id
     WHERE rpt.usuario_id = ? AND pt.subtema_id = ? AND rpt.correcta = TRUE`,
    [usuarioId, subtemaId]
  );
  return Number(total);
}

// Progreso 0-100 de un usuario en un subtema específico — ligado a las
// preguntas teóricas (RQF26) resueltas correctamente, que es la lección de
// verdad. Los ejercicios generados (arriba) son un sistema aparte para
// ganar XP/ranking y NO alimentan esta barra. Si el subtema todavía no
// tiene preguntas teóricas publicadas, el progreso es 0 (no 100%, para no
// aparentar que ya se dominó algo que ni siquiera existe todavía).
async function progresoSubtema(pool, usuarioId, subtemaId) {
  const totalTeoricas = await totalTeoricasPublicadas(pool, subtemaId);
  if (totalTeoricas === 0) return 0;
  const correctas = await contarTeoricasCorrectasSubtema(pool, usuarioId, subtemaId);
  return Math.min(100, Math.round((correctas / totalTeoricas) * 100));
}

// RQF21/RQNF30 (bono de tema) y RQNF31 ("Maestro del tema"): un tema está
// completo cuando TODOS sus subtemas que ya tienen teóricas publicadas están
// al 100%. Un subtema sin contenido todavía no cuenta ni a favor ni en
// contra (mismo criterio que progresoPromedioSubtemas en contentController).
// Si el tema no tiene NINGÚN subtema con teóricas, no se considera completo
// (evita otorgar el bono/insignia sobre un tema vacío).
async function temaCompleto(pool, usuarioId, temaId) {
  const [subtemas] = await pool.query('SELECT id FROM subtemas WHERE tema_id = ?', [temaId]);

  let algunoConContenido = false;
  for (const s of subtemas) {
    const total = await totalTeoricasPublicadas(pool, s.id);
    if (total === 0) continue;
    algunoConContenido = true;
    const correctas = await contarTeoricasCorrectasSubtema(pool, usuarioId, s.id);
    if (correctas < total) return false;
  }
  return algunoConContenido;
}

module.exports = {
  calcularNivel,
  multiplicadorRacha,
  multiplicadorVelocidad,
  obtenerEstadoRacha,
  totalTeoricasPublicadas,
  contarTeoricasCorrectasSubtema,
  progresoSubtema,
  temaCompleto,
  NIVELES,
};

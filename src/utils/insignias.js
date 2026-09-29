// RQF22 / RQNF31: lógica de desbloqueo de insignias, compartida entre el
// pool de ejercicios generados (exerciseController) y las preguntas
// teóricas (preguntaTeoricaController) — algunas insignias dependen de
// ambos sistemas a la vez (p. ej. "Explorador").
const { totalTeoricasPublicadas, contarTeoricasCorrectasSubtema, temaCompleto } = require('./progreso');

// "Velocista" (RQF22: completar un subtema completo en una sola sesión): el
// sistema no registra sesiones de app explícitamente, así que se usa como
// proxy que todas las preguntas teóricas del subtema se hayan contestado
// bien dentro de esta ventana de tiempo entre la primera y la última.
const VENTANA_VELOCISTA_MINUTOS = 20;

async function intentarDesbloquear(pool, usuarioId, codigo, desbloqueadas) {
  const [[insignia]] = await pool.query('SELECT id FROM insignias WHERE codigo = ?', [codigo]);
  if (!insignia) return;
  const [result] = await pool.query(
    'INSERT IGNORE INTO usuario_insignias (usuario_id, insignia_id) VALUES (?, ?)',
    [usuarioId, insignia.id]
  );
  if (result.affectedRows > 0) desbloqueadas.push(codigo);
}

// Primera respuesta correcta: la primera vez que el usuario acierta lo que
// sea — un ejercicio generado O una pregunta teórica, lo que pase primero.
async function evaluarPrimeraRespuesta(pool, usuarioId, desbloqueadas) {
  const [[{ total }]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM respuestas_usuario WHERE usuario_id = ? AND correcta = TRUE) +
       (SELECT COUNT(*) FROM respuestas_pregunta_teorica WHERE usuario_id = ? AND correcta = TRUE)
       AS total`,
    [usuarioId, usuarioId]
  );
  if (Number(total) === 1) await intentarDesbloquear(pool, usuarioId, 'primera_respuesta', desbloqueadas);
}

// Sin errores: 10 ejercicios GENERADOS consecutivos sin fallar. Es la única
// secuencia con un orden natural y repetible del sistema (las teóricas son
// una sola pregunta fija por subtema, sin sentido de "consecutivas").
async function evaluarSinErrores(pool, usuarioId, desbloqueadas) {
  const [ultimas10] = await pool.query(
    'SELECT correcta FROM respuestas_usuario WHERE usuario_id = ? ORDER BY id DESC LIMIT 10',
    [usuarioId]
  );
  if (ultimas10.length === 10 && ultimas10.every((r) => r.correcta)) {
    await intentarDesbloquear(pool, usuarioId, 'sin_errores', desbloqueadas);
  }
}

async function evaluarRachaFuego(pool, usuarioId, diasRacha, desbloqueadas) {
  if (diasRacha >= 7) await intentarDesbloquear(pool, usuarioId, 'racha_fuego', desbloqueadas);
}

// Explorador: al menos una respuesta correcta (generada o teórica) en algún
// subtema de CADA módulo del currículo.
async function evaluarExplorador(pool, usuarioId, desbloqueadas) {
  const [[{ totalModulos }]] = await pool.query('SELECT COUNT(*) AS totalModulos FROM modulos');
  if (Number(totalModulos) === 0) return;

  const [[{ practicados }]] = await pool.query(
    `SELECT COUNT(*) AS practicados FROM modulos m
     WHERE EXISTS (
       SELECT 1 FROM respuestas_usuario ru
       JOIN ejercicios e ON e.id = ru.ejercicio_id
       JOIN subtemas s ON s.id = e.subtema_id
       JOIN temas t ON t.id = s.tema_id
       WHERE t.modulo_id = m.id AND ru.usuario_id = ? AND ru.correcta = TRUE
     ) OR EXISTS (
       SELECT 1 FROM respuestas_pregunta_teorica rpt
       JOIN preguntas_teoricas pt ON pt.id = rpt.pregunta_id
       JOIN subtemas s2 ON s2.id = pt.subtema_id
       JOIN temas t2 ON t2.id = s2.tema_id
       WHERE t2.modulo_id = m.id AND rpt.usuario_id = ? AND rpt.correcta = TRUE
     )`,
    [usuarioId, usuarioId]
  );

  if (Number(practicados) >= Number(totalModulos)) {
    await intentarDesbloquear(pool, usuarioId, 'explorador', desbloqueadas);
  }
}

// Maestro del tema: el tema entero (todos sus subtemas con teóricas) está al
// 100%. Se llama solo en el momento exacto en que un subtema se completa,
// así dispara una única vez por tema.
async function evaluarMaestroTema(pool, usuarioId, temaId, desbloqueadas) {
  if (await temaCompleto(pool, usuarioId, temaId)) {
    await intentarDesbloquear(pool, usuarioId, 'maestro_tema', desbloqueadas);
  }
}

// Velocista: todas las teóricas del subtema se contestaron bien dentro de
// la ventana — solo tiene sentido evaluarlo cuando el subtema se acaba de
// completar (el llamador ya lo garantiza).
async function evaluarVelocista(pool, usuarioId, subtemaId, desbloqueadas) {
  const [filas] = await pool.query(
    `SELECT MIN(primera.respondido_en) AS inicio, MAX(primera.respondido_en) AS fin
     FROM (
       SELECT rpt.pregunta_id, MIN(rpt.respondido_en) AS respondido_en
       FROM respuestas_pregunta_teorica rpt
       JOIN preguntas_teoricas pt ON pt.id = rpt.pregunta_id
       WHERE rpt.usuario_id = ? AND pt.subtema_id = ? AND rpt.correcta = TRUE
       GROUP BY rpt.pregunta_id
     ) AS primera`,
    [usuarioId, subtemaId]
  );
  const inicio = filas[0]?.inicio;
  const fin = filas[0]?.fin;
  if (!inicio || !fin) return;

  const minutos = (new Date(fin) - new Date(inicio)) / 60000;
  if (minutos <= VENTANA_VELOCISTA_MINUTOS) {
    await intentarDesbloquear(pool, usuarioId, 'velocista', desbloqueadas);
  }
}

module.exports = {
  evaluarPrimeraRespuesta,
  evaluarSinErrores,
  evaluarRachaFuego,
  evaluarExplorador,
  evaluarMaestroTema,
  evaluarVelocista,
};

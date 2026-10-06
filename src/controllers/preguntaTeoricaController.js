const pool = require('../config/db');
const { totalTeoricasPublicadas, contarTeoricasCorrectasSubtema, temaCompleto } = require('../utils/progreso');
const { evaluarPrimeraRespuesta, evaluarExplorador, evaluarMaestroTema, evaluarVelocista } = require('../utils/insignias');

const XP_PREGUNTA_TEORICA = 15;
// RQNF30: bonos por completar — el subtema/tema "completo" es la barra de
// teóricas al 100%, no el pool de ejercicios generados (ver progreso.js).
const XP_BONO_SUBTEMA = 50;
const XP_BONO_TEMA = 150;

// Pantalla "Preguntas Teóricas": las preguntas de comprensión de un subtema
// específico, mostradas justo después de la Lección (RQF26). Distinto del
// pool de ejercicios generados — este es contenido fijo, no algorítmico.
async function listarPorSubtema(req, res) {
  const { subtemaId } = req.params;

  const [preguntas] = await pool.query(
    `SELECT id, titulo, cuerpo, formula_latex AS formula
     FROM preguntas_teoricas
     WHERE subtema_id = ? AND estado = 'publicado' AND activo = TRUE
     ORDER BY id`,
    [subtemaId]
  );

  const resultado = [];
  for (const p of preguntas) {
    const [opciones] = await pool.query(
      'SELECT id, texto FROM pregunta_teorica_opciones WHERE pregunta_id = ? ORDER BY id',
      [p.id]
    );
    resultado.push({
      id: p.id,
      titulo: p.titulo,
      cuerpo: p.cuerpo,
      formula: p.formula,
      opciones: opciones.map((o) => ({ id: o.id, texto: o.texto })),
    });
  }

  return res.status(200).json(resultado);
}

async function responder(req, res) {
  const { preguntaId } = req.params;
  const { usuario_id: usuarioId, opcion_id: opcionId } = req.body;

  if (!usuarioId || !opcionId) {
    return res.status(400).json({ error: 'usuario_id y opcion_id son requeridos' });
  }

  const [[opcion]] = await pool.query(
    'SELECT id, es_correcta FROM pregunta_teorica_opciones WHERE id = ? AND pregunta_id = ?',
    [opcionId, preguntaId]
  );
  if (!opcion) {
    return res.status(404).json({ error: 'Opción no encontrada para esta pregunta' });
  }

  const [[pregunta]] = await pool.query(
    `SELECT pt.subtema_id, s.tema_id
     FROM preguntas_teoricas pt
     JOIN subtemas s ON s.id = pt.subtema_id
     WHERE pt.id = ?`,
    [preguntaId]
  );
  const subtemaId = pregunta?.subtema_id;
  const temaId = pregunta?.tema_id;

  const correcta = !!opcion.es_correcta;

  // El "dominio" (barra de progreso al 100%) SÍ vive aquí, en las preguntas
  // teóricas — a diferencia de los ejercicios generados (esos son un pool
  // de XP/ranking sin tope). Si el usuario ya había respondido esta MISMA
  // pregunta correctamente antes, esa pregunta ya contaba para el 100% del
  // subtema; repetirla (repaso libre) no debe volver a otorgar el XP
  // completo — solo la primera vez que se acierta cuenta.
  const [[yaAcertadaAntes]] = await pool.query(
    'SELECT 1 AS x FROM respuestas_pregunta_teorica WHERE usuario_id = ? AND pregunta_id = ? AND correcta = TRUE LIMIT 1',
    [usuarioId, preguntaId]
  );
  const esPrimeraVezCorrecta = correcta && !yaAcertadaAntes;
  const xpOtorgado = esPrimeraVezCorrecta ? XP_PREGUNTA_TEORICA : 0;

  await pool.query(
    'INSERT INTO respuestas_pregunta_teorica (usuario_id, pregunta_id, opcion_elegida_id, correcta, xp_otorgado) VALUES (?, ?, ?, ?, ?)',
    [usuarioId, preguntaId, opcionId, correcta, xpOtorgado]
  );

  let subtemaCompletado = false;
  let temaCompletado = false;
  let xpBonoSubtema = 0;
  let xpBonoTema = 0;
  const insigniasDesbloqueadas = [];

  if (esPrimeraVezCorrecta) {
    await pool.query(
      'INSERT INTO xp_usuario (usuario_id, total) VALUES (?, 0) ON DUPLICATE KEY UPDATE usuario_id = usuario_id',
      [usuarioId]
    );
    await pool.query('UPDATE xp_usuario SET total = total + ? WHERE usuario_id = ?', [xpOtorgado, usuarioId]);
    await pool.query(
      'INSERT INTO historial_xp (usuario_id, concepto, xp_cantidad) VALUES (?, ?, ?)',
      [usuarioId, 'Pregunta teórica correcta', xpOtorgado]
    );
  }

  // A partir de aquí, TODO lo relacionado con bonos de completado (RQNF30) e
  // insignias se evalúa en CUALQUIER respuesta correcta — no solo la
  // "primera vez que se acierta ESTA pregunta" (esPrimeraVezCorrecta). Un
  // subtema/tema puede haber quedado 100% completo antes de que esta lógica
  // existiera, o en una visita anterior; atar el chequeo a
  // esPrimeraVezCorrecta significaba que esos casos nunca se volvían a
  // revisar (bug real, reportado por el usuario con su Trigonometría ya
  // completa sin insignia). La idempotencia de verdad la dan las tablas
  // subtema_completado/tema_completado (INSERT IGNORE + affectedRows) y
  // usuario_insignias — no esta bandera — así que es seguro recalcular esto
  // en cada respuesta correcta, incluidas las de repaso libre.
  if (correcta && subtemaId) {
    const totalSubtema = await totalTeoricasPublicadas(pool, subtemaId);
    const correctasSubtema = await contarTeoricasCorrectasSubtema(pool, usuarioId, subtemaId);
    const subtemaAhoraCompleto = totalSubtema > 0 && correctasSubtema === totalSubtema;

    if (subtemaAhoraCompleto) {
      // Marca de "una sola vez": si esta fila ya existía (subtema completado
      // en una respuesta anterior, incluso antes de que este código
      // existiera), affectedRows es 0 y no se vuelve a pagar el bono — pero
      // igual seguimos para re-evaluar insignias, que también son
      // idempotentes.
      const [resultadoSubtema] = await pool.query(
        'INSERT IGNORE INTO subtema_completado (usuario_id, subtema_id) VALUES (?, ?)',
        [usuarioId, subtemaId]
      );
      const esPrimeraVezSubtemaCompleto = resultadoSubtema.affectedRows > 0;
      subtemaCompletado = esPrimeraVezSubtemaCompleto;

      if (esPrimeraVezSubtemaCompleto) {
        xpBonoSubtema = XP_BONO_SUBTEMA;
        await pool.query(
          'INSERT INTO xp_usuario (usuario_id, total) VALUES (?, 0) ON DUPLICATE KEY UPDATE usuario_id = usuario_id',
          [usuarioId]
        );
        await pool.query('UPDATE xp_usuario SET total = total + ? WHERE usuario_id = ?', [xpBonoSubtema, usuarioId]);
        await pool.query(
          'INSERT INTO historial_xp (usuario_id, concepto, xp_cantidad) VALUES (?, ?, ?)',
          [usuarioId, 'Subtema completado', xpBonoSubtema]
        );
      }

      await evaluarVelocista(pool, usuarioId, subtemaId, insigniasDesbloqueadas);

      // El tema completo depende de que ESTE subtema ya haya quedado
      // completo (arriba) — el resto de sus hermanos no cambió en esta
      // petición, así que revisar su estado actual es seguro.
      if (temaId) {
        const temaAhoraCompleto = await temaCompleto(pool, usuarioId, temaId);
        if (temaAhoraCompleto) {
          const [resultadoTema] = await pool.query(
            'INSERT IGNORE INTO tema_completado (usuario_id, tema_id) VALUES (?, ?)',
            [usuarioId, temaId]
          );
          const esPrimeraVezTemaCompleto = resultadoTema.affectedRows > 0;
          temaCompletado = esPrimeraVezTemaCompleto;

          if (esPrimeraVezTemaCompleto) {
            xpBonoTema = XP_BONO_TEMA;
            await pool.query(
              'INSERT INTO xp_usuario (usuario_id, total) VALUES (?, 0) ON DUPLICATE KEY UPDATE usuario_id = usuario_id',
              [usuarioId]
            );
            await pool.query('UPDATE xp_usuario SET total = total + ? WHERE usuario_id = ?', [xpBonoTema, usuarioId]);
            await pool.query(
              'INSERT INTO historial_xp (usuario_id, concepto, xp_cantidad) VALUES (?, ?, ?)',
              [usuarioId, 'Tema completado', xpBonoTema]
            );
          }

          await evaluarMaestroTema(pool, usuarioId, temaId, insigniasDesbloqueadas);
        }
      }
    }

    await evaluarPrimeraRespuesta(pool, usuarioId, insigniasDesbloqueadas);
    await evaluarExplorador(pool, usuarioId, insigniasDesbloqueadas);
  }

  const [[opcionCorrecta]] = correcta
    ? [[null]]
    : await pool.query('SELECT id FROM pregunta_teorica_opciones WHERE pregunta_id = ? AND es_correcta = TRUE', [preguntaId]);

  return res.status(200).json({
    correcta,
    xp_otorgado: xpOtorgado,
    opcion_correcta_id: correcta ? null : opcionCorrecta?.id,
    ya_dominada: correcta && !esPrimeraVezCorrecta,
    subtema_completado: subtemaCompletado,
    tema_completado: temaCompletado,
    xp_bono_subtema: xpBonoSubtema,
    xp_bono_tema: xpBonoTema,
    insignias_desbloqueadas: insigniasDesbloqueadas,
  });
}

module.exports = { listarPorSubtema, responder };

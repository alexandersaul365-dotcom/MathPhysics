const pool = require('../config/db');
const { validarLatex } = require('../utils/latex');
const { totalTeoricasPublicadas, contarTeoricasCorrectasSubtema, temaCompleto } = require('../utils/progreso');
const { evaluarPrimeraRespuesta, evaluarExplorador, evaluarMaestroTema, evaluarVelocista } = require('../utils/insignias');

const XP_PREGUNTA_TEORICA = 15;
// RQNF30: bonos por completar — el subtema/tema "completo" es la barra de
// teóricas al 100%, no el pool de ejercicios generados (ver progreso.js).
const XP_BONO_SUBTEMA = 50;
const XP_BONO_TEMA = 150;

// Crea una pregunta teórica (RQF26), con las validaciones de RQNF36/36c.
// No hay panel de administrador todavía, así que por ahora esto se usa vía
// SQL directo para la mayoría del contenido — pero este endpoint existe y
// aplica las reglas reales, listo para cuando se construya el panel.
async function crear(req, res) {
  const {
    subtema_id: subtemaId,
    titulo,
    cuerpo,
    formula_latex: formulaLatex,
    opciones,
    admin_id: adminId,
  } = req.body;

  // RQNF36: título 5-150 caracteres, cuerpo 20-5000 caracteres, ambos obligatorios.
  if (!titulo || titulo.length < 5 || titulo.length > 150) {
    return res.status(400).json({ error: 'El título debe tener entre 5 y 150 caracteres' });
  }
  if (!cuerpo || cuerpo.length < 20 || cuerpo.length > 5000) {
    return res.status(400).json({ error: 'El cuerpo debe tener entre 20 y 5000 caracteres' });
  }
  if (!subtemaId) {
    return res.status(400).json({ error: 'El subtema es obligatorio' });
  }
  const [[subtema]] = await pool.query('SELECT id FROM subtemas WHERE id = ?', [subtemaId]);
  if (!subtema) {
    return res.status(400).json({ error: 'El subtema indicado no existe' });
  }

  // RQNF36c: si se incluye fórmula LaTeX, debe compilar con KaTeX o se rechaza.
  try {
    validarLatex(formulaLatex);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  if (!Array.isArray(opciones) || opciones.length < 2) {
    return res.status(400).json({ error: 'Se requieren al menos 2 opciones de respuesta' });
  }
  if (!opciones.some((o) => o.es_correcta)) {
    return res.status(400).json({ error: 'Debe marcarse una opción como correcta' });
  }

  const [resultado] = await pool.query(
    `INSERT INTO preguntas_teoricas (subtema_id, titulo, cuerpo, formula_latex, estado, creado_por, fecha_publicacion)
     VALUES (?, ?, ?, ?, 'publicado', ?, NOW())`,
    [subtemaId, titulo, cuerpo, formulaLatex || null, adminId]
  );
  const preguntaId = resultado.insertId;

  for (const opcion of opciones) {
    await pool.query(
      'INSERT INTO pregunta_teorica_opciones (pregunta_id, texto, es_correcta) VALUES (?, ?, ?)',
      [preguntaId, opcion.texto, !!opcion.es_correcta]
    );
  }

  return res.status(201).json({ id: preguntaId });
}

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

    // RQNF30: el bono de subtema se otorga exactamente en el momento en que
    // la ÚLTIMA teórica pendiente de ese subtema se contesta bien — esta
    // respuesta acaba de insertarse arriba, así que el conteo ya la incluye.
    const totalSubtema = await totalTeoricasPublicadas(pool, subtemaId);
    const correctasSubtema = await contarTeoricasCorrectasSubtema(pool, usuarioId, subtemaId);
    subtemaCompletado = totalSubtema > 0 && correctasSubtema === totalSubtema;

    if (subtemaCompletado) {
      xpBonoSubtema = XP_BONO_SUBTEMA;
      await pool.query('UPDATE xp_usuario SET total = total + ? WHERE usuario_id = ?', [xpBonoSubtema, usuarioId]);
      await pool.query(
        'INSERT INTO historial_xp (usuario_id, concepto, xp_cantidad) VALUES (?, ?, ?)',
        [usuarioId, 'Subtema completado', xpBonoSubtema]
      );

      await evaluarVelocista(pool, usuarioId, subtemaId, insigniasDesbloqueadas);

      // El tema completo depende de que ESTE subtema ya haya quedado
      // completo (arriba) — el resto de sus hermanos no cambió en esta
      // petición, así que revisar su estado actual es seguro.
      if (temaId) {
        temaCompletado = await temaCompleto(pool, usuarioId, temaId);
        if (temaCompletado) {
          xpBonoTema = XP_BONO_TEMA;
          await pool.query('UPDATE xp_usuario SET total = total + ? WHERE usuario_id = ?', [xpBonoTema, usuarioId]);
          await pool.query(
            'INSERT INTO historial_xp (usuario_id, concepto, xp_cantidad) VALUES (?, ?, ?)',
            [usuarioId, 'Tema completado', xpBonoTema]
          );
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

module.exports = { crear, listarPorSubtema, responder };

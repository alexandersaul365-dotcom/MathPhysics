const pool = require('../config/db');
const { progresoSubtema, totalTeoricasPublicadas } = require('../utils/progreso');

const MATERIA_LABELS = { matematicas: 'Matemáticas', fisica: 'Física' };

// Promedia el progreso (0-100) de los subtemas que SÍ tienen al menos una
// pregunta teórica (RQF26) publicada — los que todavía no tienen contenido
// no cuentan ni a favor ni en contra, para no diluir el progreso con temas
// que aún no existen. El progreso está ligado a las teóricas resueltas, no
// a los ejercicios generados (esos son un sistema aparte, solo para
// XP/ranking).
async function progresoPromedioSubtemas(usuarioId, subtemaIds) {
  const idsConTeoricas = [];
  for (const id of subtemaIds) {
    if ((await totalTeoricasPublicadas(pool, id)) > 0) idsConTeoricas.push(id);
  }
  if (idsConTeoricas.length === 0) return 0;

  let suma = 0;
  for (const id of idsConTeoricas) {
    suma += await progresoSubtema(pool, usuarioId, id);
  }
  return Math.round(suma / idsConTeoricas.length);
}

// Pantalla "Mis Materias": Matemáticas / Física con conteos reales y
// progreso real (RQF20-22) — se manda ?usuario_id= para calcularlo; sin
// ese parámetro, progreso queda en 0 (compatibilidad).
async function listarMaterias(req, res) {
  const usuarioId = req.query.usuario_id ? Number(req.query.usuario_id) : null;
  const materias = [];

  for (const [id, nombre] of Object.entries(MATERIA_LABELS)) {
    const [[{ temasCount }]] = await pool.query(
      'SELECT COUNT(*) AS temasCount FROM modulos WHERE materia = ?',
      [id]
    );
    const [subtemaRows] = await pool.query(
      `SELECT s.id
       FROM subtemas s
       JOIN temas t ON t.id = s.tema_id
       JOIN modulos m ON m.id = t.modulo_id
       WHERE m.materia = ?`,
      [id]
    );

    const progreso = usuarioId
      ? await progresoPromedioSubtemas(usuarioId, subtemaRows.map((r) => r.id))
      : 0;

    materias.push({ id, nombre, temasCount, subtemasCount: subtemaRows.length, progreso });
  }

  return res.status(200).json(materias);
}

// Pantalla "Temas de [Materia]": lista plana (lo que en la BD son "modulos"),
// cada una con su progreso real si se manda ?usuario_id=.
async function listarTemas(req, res) {
  const { materia, usuario_id: usuarioIdRaw } = req.query;
  const usuarioId = usuarioIdRaw ? Number(usuarioIdRaw) : null;

  if (!materia || !MATERIA_LABELS[materia]) {
    return res.status(400).json({ error: 'Query param "materia" requerido: matematicas | fisica' });
  }

  const [temas] = await pool.query(
    'SELECT id, nombre FROM modulos WHERE materia = ? ORDER BY id',
    [materia]
  );

  const resultado = [];
  for (const tema of temas) {
    let progreso = 0;
    if (usuarioId) {
      const [subtemaRows] = await pool.query(
        `SELECT s.id FROM subtemas s JOIN temas t ON t.id = s.tema_id WHERE t.modulo_id = ?`,
        [tema.id]
      );
      progreso = await progresoPromedioSubtemas(usuarioId, subtemaRows.map((r) => r.id));
    }
    resultado.push({ id: tema.id, nombre: tema.nombre, progreso });
  }

  return res.status(200).json(resultado);
}

// Pantalla "Subtemas de [Tema]": todos los subtemas de ese módulo, cada uno
// con su propio progreso — permite elegir cuál lección ver, en vez de
// mostrar siempre la primera (limitación que tenía antes).
async function listarSubtemas(req, res) {
  const { temaId } = req.params; // en realidad un modulo.id
  const usuarioId = req.query.usuario_id ? Number(req.query.usuario_id) : null;

  const [subtemas] = await pool.query(
    `SELECT s.id, s.nombre
     FROM subtemas s
     JOIN temas t ON t.id = s.tema_id
     WHERE t.modulo_id = ?
     ORDER BY s.id`,
    [temaId]
  );

  const resultado = [];
  for (const s of subtemas) {
    const progreso = usuarioId ? await progresoSubtema(pool, usuarioId, s.id) : 0;
    resultado.push({ id: s.id, nombre: s.nombre, progreso });
  }

  return res.status(200).json(resultado);
}

// Pantalla "Lección": el contenido publicado de un subtema ESPECÍFICO,
// organizado en secciones — cada una con su propia explicación y su propio
// ejemplo resuelto, para mostrarse como páginas separadas en la app.
async function obtenerLeccionDeSubtema(req, res) {
  const { subtemaId } = req.params;

  const [rows] = await pool.query(
    `SELECT ct.id, ct.subtema_id, ct.titulo, ct.definicion, ct.formulas_latex AS formula,
            m.nombre AS moduloNombre, m.materia
     FROM contenido_teorico ct
     JOIN subtemas s ON s.id = ct.subtema_id
     JOIN temas t ON t.id = s.tema_id
     JOIN modulos m ON m.id = t.modulo_id
     WHERE ct.subtema_id = ? AND ct.estado = 'publicado' AND ct.activo = TRUE
     ORDER BY ct.id DESC
     LIMIT 1`,
    [subtemaId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Aún no hay contenido publicado para este subtema' });
  }

  const leccion = rows[0];

  const [secciones] = await pool.query(
    'SELECT id, numero_seccion, explicacion FROM contenido_secciones WHERE contenido_id = ? ORDER BY numero_seccion',
    [leccion.id]
  );

  const seccionesConPasos = [];
  for (const seccion of secciones) {
    const [pasos] = await pool.query(
      'SELECT texto, es_final AS esFinal FROM contenido_pasos_ejemplo WHERE seccion_id = ? ORDER BY numero_paso',
      [seccion.id]
    );
    seccionesConPasos.push({
      explicacion: seccion.explicacion,
      pasos: pasos.map((p) => ({ texto: p.texto, esFinal: !!p.esFinal })),
    });
  }

  return res.status(200).json({
    titulo: leccion.titulo,
    breadcrumb: `${MATERIA_LABELS[leccion.materia]} · ${leccion.moduloNombre}`,
    definicion: leccion.definicion,
    formula: leccion.formula,
    secciones: seccionesConPasos,
    subtemaId: leccion.subtema_id,
  });
}

// Pantalla "Lección" (RUTA VIEJA, se deja por compatibilidad): el contenido
// publicado del primer subtema con lección dentro de ese tema.
async function obtenerLeccionDeTema(req, res) {
  const { temaId } = req.params; // en realidad un modulo.id

  const [modulo] = await pool.query('SELECT id, nombre, materia FROM modulos WHERE id = ?', [temaId]);
  if (modulo.length === 0) {
    return res.status(404).json({ error: 'Tema no encontrado' });
  }

  const [rows] = await pool.query(
    `SELECT ct.id, ct.subtema_id, ct.titulo, ct.definicion, ct.cuerpo, ct.formulas_latex AS formula
     FROM contenido_teorico ct
     JOIN subtemas s ON s.id = ct.subtema_id
     JOIN temas t ON t.id = s.tema_id
     WHERE t.modulo_id = ? AND ct.estado = 'publicado' AND ct.activo = TRUE
     ORDER BY ct.id
     LIMIT 1`,
    [temaId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Aún no hay contenido publicado para este tema' });
  }

  const leccion = rows[0];

  const [pasos] = await pool.query(
    'SELECT texto, es_final AS esFinal FROM contenido_pasos_ejemplo WHERE contenido_id = ? ORDER BY numero_paso',
    [leccion.id]
  );

  return res.status(200).json({
    titulo: leccion.titulo,
    breadcrumb: `${MATERIA_LABELS[modulo[0].materia]} · ${modulo[0].nombre}`,
    definicion: leccion.definicion,
    cuerpo: leccion.cuerpo,
    formula: leccion.formula,
    pasos: pasos.map((p) => ({ texto: p.texto, esFinal: !!p.esFinal })),
    subtemaId: leccion.subtema_id,
  });
}

module.exports = { listarMaterias, listarTemas, listarSubtemas, obtenerLeccionDeSubtema, obtenerLeccionDeTema };

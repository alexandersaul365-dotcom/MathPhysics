const pool = require('../config/db');

// RQF35: bitácora de auditoría. registrado_en ya se guarda en UTC-6.
async function listarBitacora(req, res) {
  const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 50, 1), 200);
  const pagina = Math.max(parseInt(req.query.pagina, 10) || 1, 1);
  const cond = [];
  const params = [];
  if (['creacion', 'edicion', 'publicacion', 'eliminacion'].includes(req.query.tipo_accion)) {
    cond.push('b.tipo_accion = ?'); params.push(req.query.tipo_accion);
  }
  if (req.query.tipo_contenido) { cond.push('b.tipo_contenido = ?'); params.push(req.query.tipo_contenido); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM bitacora_auditoria b ${where}`, params);
  const [filas] = await pool.query(
    `SELECT b.id, b.tipo_accion AS tipoAccion, b.tipo_contenido AS tipoContenido, b.contenido_id AS contenidoId,
            u.nombre_usuario AS usuario, b.registrado_en AS fecha
     FROM bitacora_auditoria b JOIN usuarios u ON u.id = b.usuario_id
     ${where} ORDER BY b.id DESC LIMIT ? OFFSET ?`,
    [...params, limite, (pagina - 1) * limite]
  );
  return res.json({ total, pagina, zonaHoraria: 'UTC-6', registros: filas });
}

// RQF36 / RQNF47: reportes con consultas SQL agregadas (nada de recorrer
// filas en JavaScript).
async function reportePorTema(req, res) {
  const [filas] = await pool.query(
    `SELECT m.id AS temaId, m.nombre AS tema, m.materia,
            COALESCE(e.estudiantes, 0) AS estudiantesActivos,
            COALESCE(e.respondidos, 0) AS ejerciciosRespondidos,
            COALESCE(e.correctos, 0) AS ejerciciosCorrectos,
            COALESCE(e.xp, 0) AS xpOtorgado,
            COALESCE(q.respondidas, 0) AS teoricasRespondidas,
            COALESCE(q.correctas, 0) AS teoricasCorrectas
     FROM modulos m
     LEFT JOIN (
       SELECT t.modulo_id, COUNT(DISTINCT ru.usuario_id) AS estudiantes, COUNT(*) AS respondidos,
              SUM(ru.correcta) AS correctos, SUM(ru.xp_otorgado) AS xp
       FROM respuestas_usuario ru
       JOIN ejercicios ej ON ej.id = ru.ejercicio_id
       JOIN subtemas s ON s.id = ej.subtema_id
       JOIN temas t ON t.id = s.tema_id
       GROUP BY t.modulo_id
     ) e ON e.modulo_id = m.id
     LEFT JOIN (
       SELECT t.modulo_id, COUNT(*) AS respondidas, SUM(rp.correcta) AS correctas
       FROM respuestas_pregunta_teorica rp
       JOIN preguntas_teoricas pt ON pt.id = rp.pregunta_id
       JOIN subtemas s ON s.id = pt.subtema_id
       JOIN temas t ON t.id = s.tema_id
       GROUP BY t.modulo_id
     ) q ON q.modulo_id = m.id
     ORDER BY m.materia, m.id`
  );
  return res.json(filas.map((f) => {
    const resp = Number(f.ejerciciosRespondidos) + Number(f.teoricasRespondidas);
    const ok = Number(f.ejerciciosCorrectos) + Number(f.teoricasCorrectas);
    return {
      ...f,
      ejerciciosCorrectos: Number(f.ejerciciosCorrectos),
      teoricasCorrectas: Number(f.teoricasCorrectas),
      xpOtorgado: Number(f.xpOtorgado),
      precision: resp === 0 ? 0 : Math.round((ok / resp) * 100),
    };
  }));
}

async function reportePorEstudiante(req, res) {
  const busqueda = (req.query.busqueda || '').trim();
  const params = [];
  let filtro = '';
  if (busqueda) { filtro = 'AND u.nombre_usuario LIKE ?'; params.push(`%${busqueda}%`); }
  const [filas] = await pool.query(
    `SELECT u.id, u.nombre_usuario AS usuario, COALESCE(x.total, 0) AS xpTotal,
            COALESCE(e.respondidos, 0) AS ejerciciosRespondidos, COALESCE(e.correctos, 0) AS ejerciciosCorrectos,
            COALESCE(q.respondidas, 0) AS teoricasRespondidas, COALESCE(q.correctas, 0) AS teoricasCorrectas,
            COALESCE(sc.subtemas, 0) AS subtemasCompletados,
            COALESCE(r.dias_consecutivos, 0) AS racha
     FROM usuarios u
     LEFT JOIN xp_usuario x ON x.usuario_id = u.id
     LEFT JOIN (SELECT usuario_id, COUNT(*) AS respondidos, SUM(correcta) AS correctos FROM respuestas_usuario GROUP BY usuario_id) e ON e.usuario_id = u.id
     LEFT JOIN (SELECT usuario_id, COUNT(*) AS respondidas, SUM(correcta) AS correctas FROM respuestas_pregunta_teorica GROUP BY usuario_id) q ON q.usuario_id = u.id
     LEFT JOIN (SELECT usuario_id, COUNT(*) AS subtemas FROM subtema_completado GROUP BY usuario_id) sc ON sc.usuario_id = u.id
     LEFT JOIN rachas r ON r.usuario_id = u.id
     WHERE u.rol = 'estudiante' ${filtro}
     ORDER BY xpTotal DESC, u.id`,
    params
  );
  return res.json(filas.map((f) => {
    const resp = Number(f.ejerciciosRespondidos) + Number(f.teoricasRespondidas);
    const ok = Number(f.ejerciciosCorrectos) + Number(f.teoricasCorrectas);
    return {
      id: f.id, usuario: f.usuario, xpTotal: Number(f.xpTotal),
      ejerciciosRespondidos: Number(f.ejerciciosRespondidos), ejerciciosCorrectos: Number(f.ejerciciosCorrectos),
      teoricasRespondidas: Number(f.teoricasRespondidas), teoricasCorrectas: Number(f.teoricasCorrectas),
      subtemasCompletados: Number(f.subtemasCompletados), racha: Number(f.racha),
      precision: resp === 0 ? 0 : Math.round((ok / resp) * 100),
    };
  }));
}

// Detalle de un estudiante, desglosado por tema.
async function detalleEstudiante(req, res) {
  const [[u]] = await pool.query("SELECT id, nombre_usuario AS usuario FROM usuarios WHERE id = ? AND rol = 'estudiante'", [req.params.id]);
  if (!u) return res.status(404).json({ error: 'Estudiante no encontrado' });
  const [temas] = await pool.query(
    `SELECT m.id AS temaId, m.nombre AS tema, m.materia,
            COALESCE(e.respondidos, 0) AS ejerciciosRespondidos, COALESCE(e.correctos, 0) AS ejerciciosCorrectos,
            COALESCE(q.respondidas, 0) AS teoricasRespondidas, COALESCE(q.correctas, 0) AS teoricasCorrectas
     FROM modulos m
     LEFT JOIN (
       SELECT t.modulo_id, COUNT(*) AS respondidos, SUM(ru.correcta) AS correctos
       FROM respuestas_usuario ru JOIN ejercicios ej ON ej.id = ru.ejercicio_id
       JOIN subtemas s ON s.id = ej.subtema_id JOIN temas t ON t.id = s.tema_id
       WHERE ru.usuario_id = ? GROUP BY t.modulo_id
     ) e ON e.modulo_id = m.id
     LEFT JOIN (
       SELECT t.modulo_id, COUNT(*) AS respondidas, SUM(rp.correcta) AS correctas
       FROM respuestas_pregunta_teorica rp JOIN preguntas_teoricas pt ON pt.id = rp.pregunta_id
       JOIN subtemas s ON s.id = pt.subtema_id JOIN temas t ON t.id = s.tema_id
       WHERE rp.usuario_id = ? GROUP BY t.modulo_id
     ) q ON q.modulo_id = m.id
     ORDER BY m.materia, m.id`,
    [u.id, u.id]
  );
  u.temas = temas.map((t) => ({
    ...t,
    ejerciciosCorrectos: Number(t.ejerciciosCorrectos),
    teoricasCorrectas: Number(t.teoricasCorrectas),
  }));
  return res.json(u);
}

module.exports = { listarBitacora, reportePorTema, reportePorEstudiante, detalleEstudiante };

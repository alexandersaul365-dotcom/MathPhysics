const pool = require('../config/db');
const { calcularNivel, multiplicadorRacha, obtenerEstadoRacha } = require('../utils/progreso');

const ICONOS_INSIGNIA = {
  primera_respuesta: '⭐',
  racha_fuego: '🔥',
  maestro_tema: '📗',
  sin_errores: '💯',
  velocista: '⚡',
  explorador: '🌍',
};

// RQF18-19
async function obtenerRacha(req, res) {
  const { usuarioId } = req.params;

  const { dias, enRiesgo } = await obtenerEstadoRacha(pool, usuarioId);

  let tiempoRestante = '';
  if (enRiesgo) {
    const ahora = new Date();
    const medianoche = new Date(ahora);
    medianoche.setHours(24, 0, 0, 0);
    const msRestantes = medianoche - ahora;
    const h = Math.floor(msRestantes / 3600000);
    const m = Math.floor((msRestantes % 3600000) / 60000);
    const s = Math.floor((msRestantes % 60000) / 1000);
    tiempoRestante = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return res.status(200).json({ dias, enRiesgo, tiempoRestante });
}

// RQF20-22
async function obtenerRecompensas(req, res) {
  const { usuarioId } = req.params;

  const [[xpRow]] = await pool.query('SELECT total FROM xp_usuario WHERE usuario_id = ?', [usuarioId]);
  const xpTotal = xpRow?.total || 0;
  const { nivel, nombreNivel, xpRestante, progresoNivel } = calcularNivel(xpTotal);

  const { dias: diasRacha } = await obtenerEstadoRacha(pool, usuarioId);
  const multiplicador = multiplicadorRacha(diasRacha);

  const bonificaciones = [];
  if (multiplicador > 1) {
    bonificaciones.push({ nombre: `Racha ${diasRacha} días`, valor: `×${multiplicador} XP` });
  }

  const [historialRows] = await pool.query(
    'SELECT concepto, xp_cantidad FROM historial_xp WHERE usuario_id = ? ORDER BY registrado_en DESC LIMIT 5',
    [usuarioId]
  );
  const historial = historialRows.map((h) => ({
    concepto: h.concepto,
    cantidad: `${h.xp_cantidad >= 0 ? '+' : ''}${h.xp_cantidad} XP`,
  }));

  return res.status(200).json({ xpTotal, nivel, nombreNivel, xpRestante, progresoNivel, bonificaciones, historial });
}

// RQF22
async function obtenerInsignias(req, res) {
  const { usuarioId } = req.params;

  const [todas] = await pool.query('SELECT id, codigo, nombre, descripcion FROM insignias ORDER BY id');
  const [desbloqueadas] = await pool.query('SELECT insignia_id FROM usuario_insignias WHERE usuario_id = ?', [usuarioId]);
  const idsDesbloqueadas = new Set(desbloqueadas.map((d) => d.insignia_id));

  const resultado = todas.map((i) => ({
    icono: ICONOS_INSIGNIA[i.codigo] || '🏅',
    nombre: i.nombre,
    descripcion: i.descripcion,
    desbloqueada: idsDesbloqueadas.has(i.id),
  }));

  return res.status(200).json(resultado);
}

// RQF16-17
async function obtenerRepaso(req, res) {
  const { usuarioId } = req.params;

  const [errores] = await pool.query(
    `SELECT ep.id, ep.ejercicio_id, ep.respuesta_dada, m.nombre AS temaNombre, e.enunciado, e.tipo
     FROM errores_pendientes ep
     JOIN ejercicios e ON e.id = ep.ejercicio_id
     JOIN subtemas s ON s.id = ep.subtema_id
     JOIN temas t ON t.id = s.tema_id
     JOIN modulos m ON m.id = t.modulo_id
     WHERE ep.usuario_id = ?
     ORDER BY ep.registrado_en DESC`,
    [usuarioId]
  );

  const resultado = [];
  for (const e of errores) {
    const respuesta = JSON.parse(e.respuesta_dada);
    let respuestaResumen = 'Respuesta incorrecta';

    if (e.tipo === 'opcion_multiple') {
      const [[opcion]] = await pool.query('SELECT texto FROM ejercicio_opciones WHERE id = ?', [respuesta.opcion_id]);
      respuestaResumen = opcion?.texto || respuestaResumen;
    } else if (e.tipo === 'numerico' || e.tipo === 'variable') {
      respuestaResumen = `${respuesta.valor}`;
    } else if (e.tipo === 'paso_a_paso') {
      respuestaResumen = 'Orden incorrecto';
    }

    resultado.push({
      id: e.id,
      ejercicioId: e.ejercicio_id,
      tema: e.temaNombre,
      enunciado: e.enunciado,
      respuestaResumen,
    });
  }

  return res.status(200).json(resultado);
}

// RQF23-24 / RQNF32-33: top 10 por XP y, si el usuario autenticado no está
// entre ellos, una segunda consulta que agrega su posición exacta al final.
async function obtenerRanking(req, res) {
  const usuarioId = req.query.usuario_id ? Number(req.query.usuario_id) : null;

  const [top] = await pool.query(
    `SELECT u.id, u.nombre_usuario, x.total
     FROM xp_usuario x
     JOIN usuarios u ON u.id = x.usuario_id
     ORDER BY x.total DESC
     LIMIT 10`
  );

  const resultado = top.map((row, idx) => ({
    posicion: idx + 1,
    nombre: row.nombre_usuario,
    xp: row.total,
    es_usuario_actual: usuarioId != null && row.id === usuarioId,
  }));

  const yaEstaEnElTop = resultado.some((r) => r.es_usuario_actual);

  if (usuarioId != null && !yaEstaEnElTop) {
    const [[propio]] = await pool.query(
      `SELECT u.nombre_usuario, x.total,
              (SELECT COUNT(*) FROM xp_usuario x2 WHERE x2.total > x.total) + 1 AS posicion
       FROM xp_usuario x
       JOIN usuarios u ON u.id = x.usuario_id
       WHERE x.usuario_id = ?`,
      [usuarioId]
    );

    if (propio) {
      resultado.push({
        posicion: propio.posicion,
        nombre: propio.nombre_usuario,
        xp: propio.total,
        es_usuario_actual: true,
      });
    }
  }

  return res.status(200).json(resultado);
}

module.exports = { obtenerRacha, obtenerRecompensas, obtenerInsignias, obtenerRepaso, obtenerRanking };

const pool = require('../config/db');
const { multiplicadorRacha, multiplicadorVelocidad } = require('../utils/progreso');
const { evaluarPrimeraRespuesta, evaluarSinErrores, evaluarRachaFuego, evaluarExplorador } = require('../utils/insignias');
const { REGISTRO_GENERADORES } = require('../generators');

function barajar(arr) {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

const CONCEPTO_POR_TIPO = {
  opcion_multiple: 'Opción múltiple correcto',
  numerico: 'Ejercicio numérico',
  variable: 'Ejercicio numérico',
  simulacion: 'Simulación completada',
  paso_a_paso: 'Paso a paso correcto',
};

async function construirDetalleEjercicio(ej) {
  const base = { id: ej.id, tipo: ej.tipo, enunciado: ej.enunciado, xp: ej.xp_otorgado };

  if (ej.tipo === 'opcion_multiple') {
    const [opciones] = await pool.query(
      'SELECT id, texto FROM ejercicio_opciones WHERE ejercicio_id = ?',
      [ej.id]
    );
    base.opciones = barajar(opciones);
  } else if (ej.tipo === 'numerico' || ej.tipo === 'variable') {
    const [[num]] = await pool.query(
      'SELECT unidad_medida FROM ejercicio_numerico WHERE ejercicio_id = ?',
      [ej.id]
    );
    base.unidad = num?.unidad_medida || null;
  } else if (ej.tipo === 'simulacion') {
    const [[sim]] = await pool.query(
      'SELECT tipo_simulacion, valores_iniciales_json FROM ejercicio_simulacion WHERE ejercicio_id = ?',
      [ej.id]
    );
    base.tipoSimulacion = sim?.tipo_simulacion || null;
    base.valoresIniciales = sim ? JSON.parse(sim.valores_iniciales_json) : null;
  } else if (ej.tipo === 'paso_a_paso') {
    const [[pp]] = await pool.query(
      'SELECT ecuacion FROM ejercicio_paso_a_paso WHERE ejercicio_id = ?',
      [ej.id]
    );
    const [pasos] = await pool.query(
      'SELECT id, descripcion FROM ejercicio_pasos WHERE ejercicio_id = ? ORDER BY numero_paso',
      [ej.id]
    );
    base.ecuacion = pp?.ecuacion || null;
    base.pasos = barajar(pasos);
  }

  return base;
}

async function obtenerAdminId() {
  const [[admin]] = await pool.query("SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1");
  return admin?.id || null;
}

// Corre el generador de ese subtema UNA vez (el generador decide su propio
// tipo/formato), lo guarda en la tabla de detalle correcta según el tipo, y
// regresa su detalle listo para el cliente (sin la respuesta correcta).
async function insertarEjercicioGenerado(subtemaId, generarFn, creadoPor) {
  const generado = generarFn();

  const [resultado] = await pool.query(
    `INSERT INTO ejercicios (subtema_id, tipo, enunciado, xp_otorgado, estado, activo, es_generado, creado_por)
     VALUES (?, ?, ?, ?, 'publicado', TRUE, TRUE, ?)`,
    [subtemaId, generado.tipo, generado.enunciado, generado.xp, creadoPor]
  );
  const ejercicioId = resultado.insertId;

  if (generado.tipo === 'numerico' || generado.tipo === 'variable') {
    await pool.query(
      'INSERT INTO ejercicio_numerico (ejercicio_id, parametros_json, respuesta_correcta, unidad_medida) VALUES (?, ?, ?, ?)',
      [ejercicioId, JSON.stringify(generado.parametros), generado.respuesta_correcta, generado.unidad]
    );
  } else if (generado.tipo === 'opcion_multiple') {
    for (const op of generado.opciones) {
      await pool.query(
        'INSERT INTO ejercicio_opciones (ejercicio_id, texto, es_correcta) VALUES (?, ?, ?)',
        [ejercicioId, op.texto, op.es_correcta]
      );
    }
  } else if (generado.tipo === 'paso_a_paso') {
    await pool.query('INSERT INTO ejercicio_paso_a_paso (ejercicio_id, ecuacion) VALUES (?, ?)', [ejercicioId, generado.ecuacion]);
    for (const paso of generado.pasos) {
      await pool.query(
        'INSERT INTO ejercicio_pasos (ejercicio_id, numero_paso, descripcion) VALUES (?, ?, ?)',
        [ejercicioId, paso.numero_paso, paso.descripcion]
      );
    }
  } else if (generado.tipo === 'simulacion') {
    await pool.query(
      'INSERT INTO ejercicio_simulacion (ejercicio_id, tipo_simulacion, valores_iniciales_json, resultado_esperado) VALUES (?, ?, ?, ?)',
      [ejercicioId, generado.tipo_simulacion, JSON.stringify(generado.valores_iniciales), generado.resultado_esperado]
    );
  }

  // Reutiliza el mismo constructor de detalle que usan los ejercicios fijos,
  // así el cliente recibe exactamente la misma forma sin importar el origen.
  return construirDetalleEjercicio({ id: ejercicioId, tipo: generado.tipo, enunciado: generado.enunciado, xp_otorgado: generado.xp });
}

// Genera UN ejercicio nuevo para ese subtema (usado por el endpoint standalone).
async function generarYGuardarEjercicio(subtemaId) {
  const generarFn = REGISTRO_GENERADORES[subtemaId];
  if (!generarFn) return null;
  const creadoPor = await obtenerAdminId();
  if (!creadoPor) return null;
  return insertarEjercicioGenerado(subtemaId, generarFn, creadoPor);
}

// Genera un LOTE de `cantidad` ejercicios, reemplazando el lote anterior
// completo (excepto los que sigan pendientes en repaso de errores de algún
// usuario — esos no se tocan, o "Reintentar" se rompería).
async function generarLoteEjercicios(subtemaId, cantidad = 10) {
  const generarFn = REGISTRO_GENERADORES[subtemaId];
  if (!generarFn) return null;
  const creadoPor = await obtenerAdminId();
  if (!creadoPor) return null;

  await pool.query(
    `UPDATE ejercicios e
     SET e.activo = FALSE
     WHERE e.subtema_id = ? AND e.es_generado = TRUE
       AND NOT EXISTS (SELECT 1 FROM errores_pendientes ep WHERE ep.ejercicio_id = e.id)`,
    [subtemaId]
  );

  const lote = [];
  for (let i = 0; i < cantidad; i++) {
    lote.push(await insertarEjercicioGenerado(subtemaId, generarFn, creadoPor));
  }
  return lote;
}

// Lista los subtemas que tienen ejercicios disponibles para practicar
// (por ahora, los que tienen generador algorítmico configurado). Alimenta
// la sección "Ejercicios" independiente de la pantalla de Lección.
async function listarSubtemasConEjercicios(req, res) {
  const ids = Object.keys(REGISTRO_GENERADORES).map(Number);
  if (ids.length === 0) return res.status(200).json([]);

  const [filas] = await pool.query(
    `SELECT s.id AS subtemaId, s.nombre AS subtemaNombre, m.nombre AS temaNombre, m.materia
     FROM subtemas s
     JOIN temas t ON t.id = s.tema_id
     JOIN modulos m ON m.id = t.modulo_id
     WHERE s.id IN (?)
     ORDER BY m.materia, m.id, s.id`,
    [ids]
  );

  return res.status(200).json(filas);
}

// RQNF16: genera un ejercicio nuevo con parámetros aleatorios y lo guarda en
// la base de datos ANTES de presentarlo (endpoint de utilidad/pruebas).
async function generarEjercicio(req, res) {
  const { subtema_id: subtemaId } = req.body;

  const nuevo = await generarYGuardarEjercicio(subtemaId);
  if (!nuevo) {
    return res.status(400).json({ error: 'Este subtema no tiene un generador algorítmico configurado' });
  }

  return res.status(201).json(nuevo);
}

// RQF9-13 / RQNF12: lista los ejercicios de un subtema. Si el subtema tiene
// un generador algorítmico registrado, regresa un lote nuevo de 10 ejercicios
// cada vez (reemplazando el lote anterior); si no, regresa los ejercicios
// fijos publicados normalmente.
async function listarEjerciciosPorSubtema(req, res) {
  const { subtemaId } = req.params;
  const subtemaIdNum = Number(subtemaId);

  // Ejercicios FIJOS publicados por el administrador (RQF27-33): solo los
  // 'publicado' y activos son visibles para el estudiante (RQNF43).
  const [ejercicios] = await pool.query(
    `SELECT id, tipo, enunciado, xp_otorgado
     FROM ejercicios
     WHERE subtema_id = ? AND es_generado = FALSE AND estado = 'publicado' AND activo = TRUE
     ORDER BY id`,
    [subtemaId]
  );

  const resultado = [];
  if (REGISTRO_GENERADORES[subtemaIdNum]) {
    const lote = await generarLoteEjercicios(subtemaIdNum, 10);
    resultado.push(...(lote || []));
  }
  for (const ej of ejercicios) {
    resultado.push(await construirDetalleEjercicio(ej));
  }

  return res.status(200).json(resultado);
}

// Un solo ejercicio por id — lo usa la pantalla de Reintento (RQF17).
async function obtenerEjercicioPorId(req, res) {
  const { ejercicioId } = req.params;

  const [[ej]] = await pool.query(
    `SELECT id, tipo, enunciado, xp_otorgado FROM ejercicios
     WHERE id = ? AND estado = 'publicado' AND activo = TRUE`,
    [ejercicioId]
  );
  if (!ej) return res.status(404).json({ error: 'Ejercicio no encontrado' });

  return res.status(200).json(await construirDetalleEjercicio(ej));
}

// RQF14 / RQNF20-22,25,29-30 + Propuesta4 (bono por velocidad): registra la
// respuesta y actualiza en cascada racha, XP, historial, repaso e insignias.
async function responderEjercicio(req, res) {
  const { ejercicioId } = req.params;
  const { usuario_id: usuarioId, respuesta, tiempo_segundos: tiempoSegundos } = req.body;

  if (!usuarioId || respuesta === undefined) {
    return res.status(400).json({ error: 'usuario_id y respuesta son requeridos' });
  }

  const [[ejercicio]] = await pool.query(
    `SELECT id, subtema_id, tipo, xp_otorgado FROM ejercicios
     WHERE id = ? AND estado = 'publicado' AND activo = TRUE`,
    [ejercicioId]
  );
  if (!ejercicio) {
    return res.status(404).json({ error: 'Ejercicio no encontrado' });
  }

  let correcta = false;
  let respuestaCorrecta = null;

  if (ejercicio.tipo === 'opcion_multiple') {
    const [[elegida]] = await pool.query(
      'SELECT es_correcta FROM ejercicio_opciones WHERE id = ? AND ejercicio_id = ?',
      [respuesta.opcion_id, ejercicioId]
    );
    correcta = !!elegida?.es_correcta;
    if (!correcta) {
      const [[correctaRow]] = await pool.query(
        'SELECT id, texto FROM ejercicio_opciones WHERE ejercicio_id = ? AND es_correcta = TRUE',
        [ejercicioId]
      );
      respuestaCorrecta = correctaRow;
    }
  } else if (ejercicio.tipo === 'numerico' || ejercicio.tipo === 'variable') {
    const [[num]] = await pool.query(
      'SELECT respuesta_correcta FROM ejercicio_numerico WHERE ejercicio_id = ?',
      [ejercicioId]
    );
    const TOLERANCIA = 0.05;
    correcta = Math.abs(Number(respuesta.valor) - Number(num.respuesta_correcta)) < TOLERANCIA;
    if (!correcta) respuestaCorrecta = { valor: num.respuesta_correcta };
  } else if (ejercicio.tipo === 'simulacion') {
    const [[sim]] = await pool.query(
      'SELECT resultado_esperado FROM ejercicio_simulacion WHERE ejercicio_id = ?',
      [ejercicioId]
    );
    const TOLERANCIA_SIMULACION = 0.5; // los valores objetivo son exactos (E12, pasos de 0.5, enteros)
    correcta = Math.abs(Number(respuesta.valor) - Number(sim.resultado_esperado)) < TOLERANCIA_SIMULACION;
    if (!correcta) respuestaCorrecta = { valor: sim.resultado_esperado };
  } else if (ejercicio.tipo === 'paso_a_paso') {
    const [pasosCorrectos] = await pool.query(
      'SELECT id FROM ejercicio_pasos WHERE ejercicio_id = ? ORDER BY numero_paso',
      [ejercicioId]
    );
    const ordenCorrecto = pasosCorrectos.map((p) => p.id);
    const ordenEnviado = (respuesta.orden || []).map(Number);
    correcta = JSON.stringify(ordenCorrecto) === JSON.stringify(ordenEnviado);
    if (!correcta) respuestaCorrecta = { orden: ordenCorrecto };
  } else {
    return res.status(400).json({ error: 'Tipo de ejercicio no soportado' });
  }

  // --- Racha (RQF18-19) ---
  const hoy = new Date().toISOString().slice(0, 10);
  const [[rachaExistente]] = await pool.query('SELECT * FROM rachas WHERE usuario_id = ?', [usuarioId]);

  let diasConsecutivos;
  if (!rachaExistente) {
    await pool.query('INSERT INTO rachas (usuario_id, dias_consecutivos, ultima_actividad) VALUES (?, 1, ?)', [usuarioId, hoy]);
    diasConsecutivos = 1;
  } else if (rachaExistente.ultima_actividad === hoy) {
    diasConsecutivos = rachaExistente.dias_consecutivos;
  } else {
    const diffDias = Math.round((new Date(hoy) - new Date(rachaExistente.ultima_actividad)) / 86400000);
    diasConsecutivos = diffDias === 1 ? rachaExistente.dias_consecutivos + 1 : 1;
    await pool.query(
      'UPDATE rachas SET dias_consecutivos = ?, ultima_actividad = ?, notificado_hoy = FALSE WHERE usuario_id = ?',
      [diasConsecutivos, hoy, usuarioId]
    );
  }

  // --- XP (racha × velocidad) / errores pendientes ---
  // El "dominio" de un tema (dejar de dar recompensa) es un concepto que
  // SOLO aplica a las preguntas teóricas fijas (RQF26) — este pool de
  // ejercicios generados existe específicamente para ganar XP de cara al
  // ranking, así que siempre otorga XP mientras la respuesta sea correcta,
  // sin importar cuántas veces se haya practicado ese subtema antes.
  let xpOtorgado = 0;
  let bonoVelocidad = 1;

  if (correcta) {
    const bonoRacha = multiplicadorRacha(diasConsecutivos);
    bonoVelocidad = multiplicadorVelocidad(tiempoSegundos);
    xpOtorgado = Math.round(ejercicio.xp_otorgado * bonoRacha * bonoVelocidad);

    await pool.query(
      'INSERT INTO xp_usuario (usuario_id, total) VALUES (?, 0) ON DUPLICATE KEY UPDATE usuario_id = usuario_id',
      [usuarioId]
    );
    await pool.query('UPDATE xp_usuario SET total = total + ? WHERE usuario_id = ?', [xpOtorgado, usuarioId]);
    await pool.query(
      'INSERT INTO historial_xp (usuario_id, concepto, xp_cantidad) VALUES (?, ?, ?)',
      [usuarioId, CONCEPTO_POR_TIPO[ejercicio.tipo] || 'Ejercicio correcto', xpOtorgado]
    );

    // RQF17: si estaba en repaso de errores, se elimina al responderse bien.
    await pool.query('DELETE FROM errores_pendientes WHERE usuario_id = ? AND ejercicio_id = ?', [usuarioId, ejercicioId]);
  } else {
    await pool.query(
      `INSERT INTO errores_pendientes (usuario_id, ejercicio_id, subtema_id, respuesta_dada)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE respuesta_dada = VALUES(respuesta_dada), registrado_en = NOW()`,
      [usuarioId, ejercicioId, ejercicio.subtema_id, JSON.stringify(respuesta)]
    );
  }

  await pool.query(
    'INSERT INTO respuestas_usuario (usuario_id, ejercicio_id, correcta, respuesta_dada, xp_otorgado) VALUES (?, ?, ?, ?, ?)',
    [usuarioId, ejercicioId, correcta, JSON.stringify(respuesta), xpOtorgado]
  );

  const insigniasDesbloqueadas = await evaluarInsignias(usuarioId, correcta, diasConsecutivos);

  return res.status(200).json({
    correcta,
    xp_otorgado: xpOtorgado,
    bono_velocidad: bonoVelocidad,
    racha_dias: diasConsecutivos,
    respuesta_correcta: respuestaCorrecta,
    insignias_desbloqueadas: insigniasDesbloqueadas,
  });
}

// RQF22 / RQNF31: evaluación simple de insignias tras cada respuesta.
async function evaluarInsignias(usuarioId, correcta, diasRacha) {
  const desbloqueadas = [];

  if (correcta) {
    await evaluarPrimeraRespuesta(pool, usuarioId, desbloqueadas);
    await evaluarSinErrores(pool, usuarioId, desbloqueadas);
    await evaluarExplorador(pool, usuarioId, desbloqueadas);
  }

  await evaluarRachaFuego(pool, usuarioId, diasRacha, desbloqueadas);

  return desbloqueadas;
}

module.exports = {
  listarSubtemasConEjercicios,
  generarEjercicio,
  listarEjerciciosPorSubtema,
  obtenerEjercicioPorId,
  responderEjercicio,
};

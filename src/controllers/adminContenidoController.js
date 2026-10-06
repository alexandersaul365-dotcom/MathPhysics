const pool = require('../config/db');
const { validarLatex } = require('../utils/latex');
const { registrarAccion, conTransaccion, AHORA_MX } = require('../utils/auditoria');
const { generarPasos, ErrorEcuacion } = require('../utils/pasosAlgebra');

// ---------------------------------------------------------------------------
// Utilidades de validación compartidas
// ---------------------------------------------------------------------------
class ErrorValidacion extends Error {
  constructor(mensaje, status = 400) {
    super(mensaje);
    this.status = status;
  }
}
const fallo = (m, s) => { throw new ErrorValidacion(m, s); };

function texto(valor, nombre, min, max) {
  if (typeof valor !== 'string') fallo(`${nombre} es obligatorio`);
  const t = valor.trim();
  if (t.length < min || t.length > max) fallo(`${nombre} debe tener entre ${min} y ${max} caracteres`);
  return t;
}

function latexOpcional(valor, max = 300) {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string') fallo('La fórmula LaTeX debe ser texto');
  if (valor.length > max) fallo(`La fórmula LaTeX no puede superar ${max} caracteres`);
  try {
    validarLatex(valor); // RQNF36c
  } catch (e) {
    fallo(e.message);
  }
  return valor;
}

async function validarSubtema(subtemaId) {
  if (!subtemaId) fallo('El subtema es obligatorio');
  const [[s]] = await pool.query('SELECT id FROM subtemas WHERE id = ?', [subtemaId]);
  if (!s) fallo('El subtema indicado no existe');
  return Number(subtemaId);
}

function enviarError(res, err) {
  if (err instanceof ErrorValidacion) return res.status(err.status).json({ error: err.message });
  throw err;
}

// Envuelve un handler para convertir ErrorValidacion en respuestas 4xx.
const conValidacion = (fn) => async (req, res) => {
  try {
    return await fn(req, res);
  } catch (err) {
    return enviarError(res, err);
  }
};

// ---------------------------------------------------------------------------
// Catálogo y perfil
// ---------------------------------------------------------------------------
async function perfilAdmin(req, res) {
  const [[u]] = await pool.query('SELECT id, nombre_usuario, rol FROM usuarios WHERE id = ?', [req.user.id]);
  const [permisos] = await pool.query('SELECT permiso FROM permisos_admin WHERE usuario_id = ?', [req.user.id]);
  return res.json({ id: u.id, nombreUsuario: u.nombre_usuario, rol: u.rol, permisos: permisos.map((p) => p.permiso) });
}

// Selector tema → subtema para los formularios.
async function catalogo(req, res) {
  const [filas] = await pool.query(
    `SELECT s.id AS subtemaId, s.nombre AS subtemaNombre, t.id AS temaId, t.nombre AS temaNombre,
            m.nombre AS moduloNombre, m.materia
     FROM subtemas s JOIN temas t ON t.id = s.tema_id JOIN modulos m ON m.id = t.modulo_id
     ORDER BY m.materia, m.id, t.id, s.id`
  );
  return res.json(filas);
}

// ---------------------------------------------------------------------------
// Preguntas teóricas (RQF26, RQNF36/36b/36c/37)
// ---------------------------------------------------------------------------
function validarPregunta(body) {
  const titulo = texto(body.titulo, 'El título', 5, 150);
  const cuerpo = texto(body.cuerpo, 'El cuerpo', 20, 5000);
  const formula = latexOpcional(body.formula_latex);
  const opciones = body.opciones;
  if (!Array.isArray(opciones) || opciones.length < 2 || opciones.length > 5) {
    fallo('Se requieren entre 2 y 5 opciones de respuesta');
  }
  const limpias = opciones.map((o) => ({
    id: o && o.id ? Number(o.id) : null,
    texto: texto(o && o.texto, 'El texto de cada opción', 1, 300),
    es_correcta: !!(o && o.es_correcta),
  }));
  if (limpias.filter((o) => o.es_correcta).length !== 1) fallo('Debe marcarse exactamente una opción como correcta');
  return { titulo, cuerpo, formula, opciones: limpias };
}

async function listarPreguntas(req, res) {
  const { subtema_id: subtemaId, estado } = req.query;
  const cond = ['pt.activo = TRUE'];
  const params = [];
  if (subtemaId) { cond.push('pt.subtema_id = ?'); params.push(subtemaId); }
  if (estado === 'borrador' || estado === 'publicado') { cond.push('pt.estado = ?'); params.push(estado); }
  const [filas] = await pool.query(
    `SELECT pt.id, pt.titulo, pt.estado, pt.version, pt.subtema_id AS subtemaId, s.nombre AS subtemaNombre,
            pt.fecha_publicacion AS fechaPublicacion
     FROM preguntas_teoricas pt JOIN subtemas s ON s.id = pt.subtema_id
     WHERE ${cond.join(' AND ')} ORDER BY pt.id DESC`,
    params
  );
  return res.json(filas);
}

async function obtenerPregunta(req, res) {
  const [[p]] = await pool.query(
    `SELECT id, subtema_id AS subtemaId, titulo, cuerpo, formula_latex AS formulaLatex, estado, version,
            fecha_publicacion AS fechaPublicacion
     FROM preguntas_teoricas WHERE id = ? AND activo = TRUE`,
    [req.params.id]
  );
  if (!p) return res.status(404).json({ error: 'Pregunta no encontrada' });
  const [opciones] = await pool.query(
    'SELECT id, texto, es_correcta AS esCorrecta FROM pregunta_teorica_opciones WHERE pregunta_id = ? ORDER BY id',
    [p.id]
  );
  p.opciones = opciones.map((o) => ({ ...o, esCorrecta: !!o.esCorrecta }));
  return res.json(p);
}

async function crearPregunta(req, res) {
  const v = validarPregunta(req.body);
  const subtemaId = await validarSubtema(req.body.subtema_id);
  const id = await conTransaccion(async (conn) => {
    // RQF32: todo contenido nuevo nace como borrador.
    const [r] = await conn.query(
      `INSERT INTO preguntas_teoricas (subtema_id, titulo, cuerpo, formula_latex, estado, creado_por)
       VALUES (?, ?, ?, ?, 'borrador', ?)`,
      [subtemaId, v.titulo, v.cuerpo, v.formula, req.user.id]
    );
    for (const o of v.opciones) {
      await conn.query('INSERT INTO pregunta_teorica_opciones (pregunta_id, texto, es_correcta) VALUES (?, ?, ?)', [r.insertId, o.texto, o.es_correcta]);
    }
    await registrarAccion(conn, req.user.id, 'creacion', 'pregunta_teorica', r.insertId);
    return r.insertId;
  });
  return res.status(201).json({ id, estado: 'borrador' });
}

async function editarPregunta(req, res) {
  const { id } = req.params;
  const [[actual]] = await pool.query('SELECT id FROM preguntas_teoricas WHERE id = ? AND activo = TRUE', [id]);
  if (!actual) return res.status(404).json({ error: 'Pregunta no encontrada' });
  const v = validarPregunta(req.body);
  const subtemaId = await validarSubtema(req.body.subtema_id);

  await conTransaccion(async (conn) => {
    await conn.query(
      'UPDATE preguntas_teoricas SET subtema_id = ?, titulo = ?, cuerpo = ?, formula_latex = ?, version = version + 1 WHERE id = ?',
      [subtemaId, v.titulo, v.cuerpo, v.formula, id]
    );
    // RQNF37: las respuestas de los estudiantes se conservan. Las opciones que
    // ya tienen respuestas no se pueden borrar (FK); se actualizan en su lugar.
    const [existentes] = await conn.query('SELECT id FROM pregunta_teorica_opciones WHERE pregunta_id = ?', [id]);
    const idsExistentes = new Set(existentes.map((o) => o.id));
    const idsEnviados = new Set(v.opciones.filter((o) => o.id).map((o) => o.id));
    for (const o of v.opciones) {
      if (o.id) {
        if (!idsExistentes.has(o.id)) fallo('Una de las opciones no pertenece a esta pregunta');
        await conn.query('UPDATE pregunta_teorica_opciones SET texto = ?, es_correcta = ? WHERE id = ?', [o.texto, o.es_correcta, o.id]);
      } else {
        await conn.query('INSERT INTO pregunta_teorica_opciones (pregunta_id, texto, es_correcta) VALUES (?, ?, ?)', [id, o.texto, o.es_correcta]);
      }
    }
    for (const oid of idsExistentes) {
      if (idsEnviados.has(oid)) continue;
      const [[resp]] = await conn.query('SELECT 1 AS x FROM respuestas_pregunta_teorica WHERE opcion_elegida_id = ? LIMIT 1', [oid]);
      if (resp) fallo('No se puede quitar una opción que ya fue elegida por estudiantes. Edita su texto en su lugar.', 409);
      await conn.query('DELETE FROM pregunta_teorica_opciones WHERE id = ?', [oid]);
    }
    await registrarAccion(conn, req.user.id, 'edicion', 'pregunta_teorica', Number(id));
  });
  return res.json({ id: Number(id) });
}

async function publicarPregunta(req, res) {
  const { id } = req.params;
  const [[p]] = await pool.query('SELECT id, estado FROM preguntas_teoricas WHERE id = ? AND activo = TRUE', [id]);
  if (!p) return res.status(404).json({ error: 'Pregunta no encontrada' });
  if (p.estado === 'publicado') return res.status(409).json({ error: 'La pregunta ya está publicada' });
  await conTransaccion(async (conn) => {
    await conn.query(`UPDATE preguntas_teoricas SET estado = 'publicado', fecha_publicacion = ${AHORA_MX} WHERE id = ?`, [id]);
    await registrarAccion(conn, req.user.id, 'publicacion', 'pregunta_teorica', Number(id));
  });
  return res.json({ id: Number(id), estado: 'publicado' });
}

async function eliminarPregunta(req, res) {
  const { id } = req.params;
  const [[p]] = await pool.query('SELECT id FROM preguntas_teoricas WHERE id = ? AND activo = TRUE', [id]);
  if (!p) return res.status(404).json({ error: 'Pregunta no encontrada' });
  await conTransaccion(async (conn) => {
    await conn.query('UPDATE preguntas_teoricas SET activo = FALSE WHERE id = ?', [id]); // RQNF37: baja lógica
    await registrarAccion(conn, req.user.id, 'eliminacion', 'pregunta_teorica', Number(id));
  });
  return res.json({ id: Number(id), eliminada: true });
}

// ---------------------------------------------------------------------------
// Ejercicios (RQF27-31, RQNF38-42)
// ---------------------------------------------------------------------------
const XP = { opcion_multiple: 10, numerico: 20, variable: 20, simulacion: 30, paso_a_paso: 30 };
const TIPOS_EDITABLES = ['opcion_multiple', 'numerico', 'variable', 'simulacion'];
const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82, 100, 120, 150, 180, 220, 270, 330, 390, 470, 560, 680, 820, 1000];
const VOLTAJES_OHM = [1.5, 3, 6, 12];
const BATERIAS = [1.5, 3, 6];
const r = (n, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

function numeroEnRango(v, nombre, min, max, { entero = false, multiploDe = null } = {}) {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) fallo(`${nombre} debe ser un número`);
  if (n < min || n > max) fallo(`${nombre} debe estar entre ${min} y ${max}`);
  if (entero && !Number.isInteger(n)) fallo(`${nombre} debe ser un número entero`);
  if (multiploDe && Math.abs(n / multiploDe - Math.round(n / multiploDe)) > 1e-9) fallo(`${nombre} debe ser múltiplo de ${multiploDe}`);
  return n;
}
function listaDe(valores, nombre, permitidos, min, max) {
  if (!Array.isArray(valores) || valores.length < min || valores.length > max) fallo(`${nombre}: indica entre ${min} y ${max} valores`);
  return valores.map((x) => {
    const n = Number(x);
    if (!permitidos.includes(n)) fallo(`${nombre}: ${x} no es un valor permitido (${permitidos.join(', ')})`);
    return n;
  });
}

// RQF29 / RQNF41: valida los valores iniciales por tipo y calcula el
// resultado esperado automáticamente. Mismo formato JSON que los generadores.
function construirSimulacion(tipo, v) {
  v = v || {};
  switch (tipo) {
    case 'ley_ohm': {
      const voltaje = numeroEnRango(v.voltaje, 'El voltaje', 1.5, 12);
      if (!VOLTAJES_OHM.includes(voltaje)) fallo('El voltaje debe ser 1.5, 3, 6 o 12 V');
      const resistencia = numeroEnRango(v.resistencia, 'La resistencia', 10, 1000);
      if (!E12.includes(resistencia)) fallo('La resistencia debe ser un valor de la serie E12 entre 10 y 1000 Ω');
      return { valores: { voltaje, resistencia }, resultado: r(voltaje / resistencia) };
    }
    case 'segunda_ley_newton': {
      const masa = numeroEnRango(v.masa, 'La masa', 1, 100);
      const fuerza = numeroEnRango(v.fuerza, 'La fuerza', 0.5, 1000, { multiploDe: 0.5 });
      return {
        valores: { fijos: { masa }, incognita: 'fuerza', objetivo: { aceleracion: r(fuerza / masa, 3) }, rango: { min: 0.5, max: 1000, paso: 0.5 } },
        resultado: fuerza,
      };
    }
    case 'energia_potencial': {
      const masa = numeroEnRango(v.masa, 'La masa', 1, 100);
      const altura = numeroEnRango(v.altura, 'La altura', 1, 50, { entero: true });
      return {
        valores: { fijos: { masa, g: 9.8 }, incognita: 'altura', objetivo: { energia: r(masa * 9.8 * altura, 1) }, rango: { min: 1, max: 50, paso: 1 } },
        resultado: altura,
      };
    }
    case 'pitagoras': {
      const a = numeroEnRango(v.cateto_a, 'El cateto a', 1, 50, { entero: true });
      const b = numeroEnRango(v.cateto_b, 'El cateto b', 1, 50, { entero: true });
      return {
        valores: { fijos: { cateto_a: a }, incognita: 'cateto_b', objetivo: { hipotenusa: r(Math.sqrt(a * a + b * b), 3) }, rango: { min: 1, max: 50, paso: 1 } },
        resultado: b,
      };
    }
    case 'voltaje_serie': {
      const baterias = listaDe(v.baterias, 'Baterías', BATERIAS, 1, 4);
      const ultima = baterias[baterias.length - 1];
      return {
        valores: { fijos: { baterias: baterias.slice(0, -1) }, incognita: 'ultima_bateria', objetivo: { voltaje_total: r(baterias.reduce((s, x) => s + x, 0), 2) }, opciones: BATERIAS },
        resultado: ultima,
      };
    }
    case 'resistencias_serie': {
      const rs = listaDe(v.resistencias, 'Resistencias', E12, 2, 4);
      return {
        valores: { fijos: { resistencias: rs.slice(0, -1) }, incognita: 'ultima_resistencia', objetivo: { resistencia_total: rs.reduce((s, x) => s + x, 0) }, opciones: E12 },
        resultado: rs[rs.length - 1],
      };
    }
    default:
      return fallo('Tipo de simulación no válido');
  }
}


// Inversa de construirSimulacion: reconstruye los campos que capturó el
// administrador a partir de lo guardado, para poder editar la simulación.
function entradaDeSimulacion(tipo, v, resultado) {
  switch (tipo) {
    case 'ley_ohm': return { voltaje: v.voltaje, resistencia: v.resistencia };
    case 'segunda_ley_newton': return { masa: v.fijos.masa, fuerza: resultado };
    case 'energia_potencial': return { masa: v.fijos.masa, altura: resultado };
    case 'pitagoras': return { cateto_a: v.fijos.cateto_a, cateto_b: resultado };
    case 'voltaje_serie': return { baterias: [...v.fijos.baterias, resultado] };
    case 'resistencias_serie': return { resistencias: [...v.fijos.resistencias, resultado] };
    default: return {};
  }
}

// Valida el cuerpo según el tipo y devuelve lo necesario para insertar.
function validarEjercicio(tipo, body) {
  if (!TIPOS_EDITABLES.includes(tipo)) fallo('Tipo de ejercicio no válido');
  const enunciado = texto(body.enunciado, 'El enunciado', 10, 500);
  const base = { tipo, enunciado };

  if (tipo === 'opcion_multiple') {
    const ops = body.opciones;
    if (!Array.isArray(ops) || ops.length < 3 || ops.length > 5) fallo('Se requieren entre 3 y 5 opciones'); // RQNF38
    base.opciones = ops.map((o) => ({ texto: texto(o && o.texto, 'El texto de cada opción', 1, 200), es_correcta: !!(o && o.es_correcta) }));
    if (base.opciones.filter((o) => o.es_correcta).length !== 1) fallo('Debe marcarse exactamente una opción como correcta');
  } else if (tipo === 'numerico' || tipo === 'variable') {
    const n = typeof body.respuesta_correcta === 'string' && body.respuesta_correcta.trim() !== '' ? Number(body.respuesta_correcta) : body.respuesta_correcta;
    if (typeof n !== 'number' || !Number.isFinite(n)) fallo('La respuesta correcta debe ser un número'); // RQNF39
    if (Math.abs(n) >= 1e8) fallo('La respuesta correcta es demasiado grande');
    base.respuesta = r(n);
    const unidad = body.unidad_medida;
    if (unidad !== undefined && unidad !== null && unidad !== '') {
      if (typeof unidad !== 'string' || unidad.trim().length > 20) fallo('La unidad de medida no puede superar 20 caracteres');
      base.unidad = unidad.trim();
    } else base.unidad = null;
  } else if (tipo === 'simulacion') {
    if (typeof body.tipo_simulacion !== 'string') fallo('El tipo de simulación es obligatorio');
    base.sim = construirSimulacion(body.tipo_simulacion, body.valores);
    base.tipoSimulacion = body.tipo_simulacion;
  }
  return base;
}

async function insertarDetalle(conn, ejercicioId, v) {
  if (v.tipo === 'opcion_multiple') {
    for (const o of v.opciones) {
      await conn.query('INSERT INTO ejercicio_opciones (ejercicio_id, texto, es_correcta) VALUES (?, ?, ?)', [ejercicioId, o.texto, o.es_correcta]);
    }
  } else if (v.tipo === 'numerico' || v.tipo === 'variable') {
    await conn.query(
      'INSERT INTO ejercicio_numerico (ejercicio_id, parametros_json, respuesta_correcta, unidad_medida) VALUES (?, ?, ?, ?)',
      [ejercicioId, '{}', v.respuesta, v.unidad]
    );
  } else if (v.tipo === 'simulacion') {
    await conn.query(
      'INSERT INTO ejercicio_simulacion (ejercicio_id, tipo_simulacion, valores_iniciales_json, resultado_esperado) VALUES (?, ?, ?, ?)',
      [ejercicioId, v.tipoSimulacion, JSON.stringify(v.sim.valores), v.sim.resultado]
    );
  }
}

async function crearEjercicio(req, res) {
  const tipo = req.body.tipo;
  const v = validarEjercicio(tipo, req.body);
  const subtemaId = await validarSubtema(req.body.subtema_id);
  const id = await conTransaccion(async (conn) => {
    const [ins] = await conn.query(
      `INSERT INTO ejercicios (subtema_id, tipo, enunciado, xp_otorgado, estado, activo, es_generado, creado_por)
       VALUES (?, ?, ?, ?, 'borrador', TRUE, FALSE, ?)`,
      [subtemaId, tipo, v.enunciado, XP[tipo], req.user.id]
    );
    await insertarDetalle(conn, ins.insertId, v);
    await registrarAccion(conn, req.user.id, 'creacion', 'ejercicio', ins.insertId);
    return ins.insertId;
  });
  return res.status(201).json({ id, estado: 'borrador', resultadoEsperado: v.sim ? v.sim.resultado : undefined });
}

async function editarEjercicio(req, res) {
  const { id } = req.params;
  const [[ej]] = await pool.query('SELECT id, tipo FROM ejercicios WHERE id = ? AND activo = TRUE AND es_generado = FALSE', [id]);
  if (!ej) return res.status(404).json({ error: 'Ejercicio no encontrado' });
  // RQF30/31: los ejercicios paso a paso no se editan, solo se crean o eliminan.
  if (ej.tipo === 'paso_a_paso') return res.status(405).json({ error: 'Los ejercicios paso a paso no se pueden editar; elimínalo y crea uno nuevo' });
  const v = validarEjercicio(ej.tipo, req.body); // el tipo no cambia al editar
  const subtemaId = await validarSubtema(req.body.subtema_id);

  await conTransaccion(async (conn) => {
    await conn.query('UPDATE ejercicios SET subtema_id = ?, enunciado = ? WHERE id = ?', [subtemaId, v.enunciado, id]);
    await conn.query('DELETE FROM ejercicio_opciones WHERE ejercicio_id = ?', [id]);
    await conn.query('DELETE FROM ejercicio_numerico WHERE ejercicio_id = ?', [id]);
    await conn.query('DELETE FROM ejercicio_simulacion WHERE ejercicio_id = ?', [id]);
    await insertarDetalle(conn, id, v);
    await registrarAccion(conn, req.user.id, 'edicion', 'ejercicio', Number(id));
  });
  return res.json({ id: Number(id), resultadoEsperado: v.sim ? v.sim.resultado : undefined });
}

// RQF31: vista previa de los pasos que generaría el servidor (no guarda nada).
async function previsualizarPasos(req, res) {
  try {
    const g = generarPasos(req.body.ecuacion);
    return res.json({ ecuacion: g.ecuacion, solucion: g.solucion, pasos: g.pasos });
  } catch (e) {
    if (e instanceof ErrorEcuacion) return res.status(422).json({ error: e.message, excedeLimite: e.excedeLimite });
    throw e;
  }
}

// RQF31: confirmación del administrador. El servidor REGENERA los pasos a
// partir de la ecuación (no confía en pasos enviados por el cliente) y guarda
// el ejercicio como borrador.
async function crearPasoAPaso(req, res) {
  let g;
  try {
    g = generarPasos(req.body.ecuacion);
  } catch (e) {
    if (e instanceof ErrorEcuacion) return res.status(422).json({ error: e.message, excedeLimite: e.excedeLimite });
    throw e;
  }
  const subtemaId = await validarSubtema(req.body.subtema_id);
  const enunciado = req.body.enunciado
    ? texto(req.body.enunciado, 'El enunciado', 10, 500)
    : `Ordena los pasos para resolver: ${g.ecuacion}`;

  const id = await conTransaccion(async (conn) => {
    const [ins] = await conn.query(
      `INSERT INTO ejercicios (subtema_id, tipo, enunciado, xp_otorgado, estado, activo, es_generado, creado_por)
       VALUES (?, 'paso_a_paso', ?, ?, 'borrador', TRUE, FALSE, ?)`,
      [subtemaId, enunciado, XP.paso_a_paso, req.user.id]
    );
    await conn.query('INSERT INTO ejercicio_paso_a_paso (ejercicio_id, ecuacion) VALUES (?, ?)', [ins.insertId, g.ecuacion]);
    for (const p of g.pasos) {
      await conn.query('INSERT INTO ejercicio_pasos (ejercicio_id, numero_paso, descripcion) VALUES (?, ?, ?)', [ins.insertId, p.numero_paso, p.descripcion]);
    }
    await registrarAccion(conn, req.user.id, 'creacion', 'ejercicio', ins.insertId);
    return ins.insertId;
  });
  return res.status(201).json({ id, estado: 'borrador', pasos: g.pasos });
}

async function listarEjercicios(req, res) {
  const { subtema_id: subtemaId, tipo, estado } = req.query;
  const cond = ['e.activo = TRUE', 'e.es_generado = FALSE'];
  const params = [];
  if (subtemaId) { cond.push('e.subtema_id = ?'); params.push(subtemaId); }
  if (TIPOS_EDITABLES.concat('paso_a_paso').includes(tipo)) { cond.push('e.tipo = ?'); params.push(tipo); }
  if (estado === 'borrador' || estado === 'publicado') { cond.push('e.estado = ?'); params.push(estado); }
  const [filas] = await pool.query(
    `SELECT e.id, e.tipo, e.enunciado, e.estado, e.subtema_id AS subtemaId, s.nombre AS subtemaNombre,
            e.fecha_publicacion AS fechaPublicacion
     FROM ejercicios e JOIN subtemas s ON s.id = e.subtema_id
     WHERE ${cond.join(' AND ')} ORDER BY e.id DESC`,
    params
  );
  return res.json(filas);
}

async function obtenerEjercicio(req, res) {
  const [[e]] = await pool.query(
    `SELECT id, subtema_id AS subtemaId, tipo, enunciado, estado, xp_otorgado AS xp, fecha_publicacion AS fechaPublicacion
     FROM ejercicios WHERE id = ? AND activo = TRUE AND es_generado = FALSE`,
    [req.params.id]
  );
  if (!e) return res.status(404).json({ error: 'Ejercicio no encontrado' });

  if (e.tipo === 'opcion_multiple') {
    const [ops] = await pool.query('SELECT id, texto, es_correcta AS esCorrecta FROM ejercicio_opciones WHERE ejercicio_id = ? ORDER BY id', [e.id]);
    e.opciones = ops.map((o) => ({ ...o, esCorrecta: !!o.esCorrecta }));
  } else if (e.tipo === 'numerico' || e.tipo === 'variable') {
    const [[n]] = await pool.query('SELECT respuesta_correcta AS respuestaCorrecta, unidad_medida AS unidad FROM ejercicio_numerico WHERE ejercicio_id = ?', [e.id]);
    e.respuestaCorrecta = n ? Number(n.respuestaCorrecta) : null;
    e.unidad = n ? n.unidad : null;
  } else if (e.tipo === 'simulacion') {
    const [[s]] = await pool.query('SELECT tipo_simulacion AS tipoSimulacion, valores_iniciales_json AS valores, resultado_esperado AS resultadoEsperado FROM ejercicio_simulacion WHERE ejercicio_id = ?', [e.id]);
    if (s) {
      e.tipoSimulacion = s.tipoSimulacion;
      e.valores = JSON.parse(s.valores);
      e.resultadoEsperado = Number(s.resultadoEsperado);
      e.entrada = entradaDeSimulacion(s.tipoSimulacion, e.valores, e.resultadoEsperado); // para precargar el formulario de edición
    }
  } else if (e.tipo === 'paso_a_paso') {
    const [[pp]] = await pool.query('SELECT ecuacion FROM ejercicio_paso_a_paso WHERE ejercicio_id = ?', [e.id]);
    const [pasos] = await pool.query('SELECT numero_paso AS numero, descripcion FROM ejercicio_pasos WHERE ejercicio_id = ? ORDER BY numero_paso', [e.id]);
    e.ecuacion = pp ? pp.ecuacion : null;
    e.pasos = pasos;
  }
  return res.json(e);
}

async function publicarEjercicio(req, res) {
  const { id } = req.params;
  const [[e]] = await pool.query('SELECT id, estado FROM ejercicios WHERE id = ? AND activo = TRUE AND es_generado = FALSE', [id]);
  if (!e) return res.status(404).json({ error: 'Ejercicio no encontrado' });
  if (e.estado === 'publicado') return res.status(409).json({ error: 'El ejercicio ya está publicado' });
  await conTransaccion(async (conn) => {
    await conn.query(`UPDATE ejercicios SET estado = 'publicado', fecha_publicacion = ${AHORA_MX} WHERE id = ?`, [id]);
    await registrarAccion(conn, req.user.id, 'publicacion', 'ejercicio', Number(id));
  });
  return res.json({ id: Number(id), estado: 'publicado' });
}

async function eliminarEjercicio(req, res) {
  const { id } = req.params;
  const [[e]] = await pool.query('SELECT id FROM ejercicios WHERE id = ? AND activo = TRUE AND es_generado = FALSE', [id]);
  if (!e) return res.status(404).json({ error: 'Ejercicio no encontrado' });
  await conTransaccion(async (conn) => {
    await conn.query('UPDATE ejercicios SET activo = FALSE WHERE id = ?', [id]); // baja lógica; respuestas se conservan
    await registrarAccion(conn, req.user.id, 'eliminacion', 'ejercicio', Number(id));
  });
  return res.json({ id: Number(id), eliminado: true });
}

module.exports = {
  conValidacion, ErrorValidacion, fallo, texto, latexOpcional, validarSubtema,
  perfilAdmin, catalogo,
  listarPreguntas, obtenerPregunta, crearPregunta, editarPregunta, publicarPregunta, eliminarPregunta,
  listarEjercicios, obtenerEjercicio, crearEjercicio, editarEjercicio, previsualizarPasos, crearPasoAPaso,
  publicarEjercicio, eliminarEjercicio,
};

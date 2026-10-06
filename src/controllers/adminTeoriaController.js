const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../config/db');
const { registrarAccion, conTransaccion, AHORA_MX } = require('../utils/auditoria');
const { fallo, texto, latexOpcional, validarSubtema } = require('./adminContenidoController');

const DIR_UPLOADS = path.join(__dirname, '..', '..', 'uploads', 'contenido');
const MAX_IMAGEN_BYTES = 2 * 1024 * 1024; // RQF26 / RQF34: JPG o PNG, máx. 2 MB
const MAX_IMAGENES = 3;

// Decodifica y valida una imagen en base64: formato por firma real del
// archivo (no por lo que diga el cliente) y tamaño máximo.
function validarImagen(img) {
  if (!img || typeof img.base64 !== 'string') fallo('Cada imagen debe incluir su contenido en base64');
  const limpio = img.base64.replace(/^data:image\/\w+;base64,/, '');
  const buf = Buffer.from(limpio, 'base64');
  if (buf.length === 0) fallo('La imagen está vacía');
  if (buf.length > MAX_IMAGEN_BYTES) fallo('Cada imagen debe pesar máximo 2 MB');
  let formato = null;
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) formato = 'png';
  else if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) formato = 'jpg';
  if (!formato) fallo('Solo se permiten imágenes JPG o PNG');
  return { buf, formato };
}

async function listarContenido(req, res) {
  const { subtema_id: subtemaId } = req.query;
  const cond = ['ct.activo = TRUE'];
  const params = [];
  if (subtemaId) { cond.push('ct.subtema_id = ?'); params.push(subtemaId); }
  const [filas] = await pool.query(
    `SELECT ct.id, ct.titulo, ct.version, ct.estado, ct.subtema_id AS subtemaId, s.nombre AS subtemaNombre,
            ct.fecha_publicacion AS fechaPublicacion
     FROM contenido_teorico ct JOIN subtemas s ON s.id = ct.subtema_id
     WHERE ${cond.join(' AND ')} ORDER BY ct.subtema_id, ct.version DESC`,
    params
  );
  return res.json(filas);
}

async function obtenerContenido(req, res) {
  const [[c]] = await pool.query(
    `SELECT id, subtema_id AS subtemaId, titulo, definicion, cuerpo, formulas_latex AS formulasLatex, version, estado,
            fecha_publicacion AS fechaPublicacion
     FROM contenido_teorico WHERE id = ? AND activo = TRUE`,
    [req.params.id]
  );
  if (!c) return res.status(404).json({ error: 'Contenido no encontrado' });
  const [imgs] = await pool.query('SELECT id, url, formato, tamano_bytes AS tamanoBytes FROM contenido_teorico_imagenes WHERE contenido_id = ?', [c.id]);
  c.imagenes = imgs;
  return res.json(c);
}

// RQF34: cada carga/actualización crea una NUEVA versión (version incremental
// por subtema) en estado borrador; la versión publicada anterior sigue
// visible para los estudiantes hasta que se publique la nueva.
async function crearVersionContenido(req, res) {
  const b = req.body;
  const subtemaId = await validarSubtema(b.subtema_id);
  const titulo = texto(b.titulo, 'El título', 5, 150);
  const cuerpo = texto(b.cuerpo, 'El cuerpo', 20, 5000); // RQNF45
  let definicion = null;
  if (b.definicion !== undefined && b.definicion !== null && b.definicion !== '') definicion = texto(b.definicion, 'La definición', 1, 500);
  const formula = latexOpcional(b.formulas_latex, 2000);

  const imagenes = b.imagenes === undefined || b.imagenes === null ? [] : b.imagenes;
  if (!Array.isArray(imagenes) || imagenes.length > MAX_IMAGENES) fallo(`Máximo ${MAX_IMAGENES} imágenes por contenido`);
  const decodificadas = imagenes.map(validarImagen);

  const archivosCreados = [];
  try {
    const resultado = await conTransaccion(async (conn) => {
      const [[{ v }]] = await conn.query('SELECT COALESCE(MAX(version), 0) + 1 AS v FROM contenido_teorico WHERE subtema_id = ? FOR UPDATE', [subtemaId]);
      const [ins] = await conn.query(
        `INSERT INTO contenido_teorico (subtema_id, titulo, definicion, cuerpo, formulas_latex, version, estado, creado_por)
         VALUES (?, ?, ?, ?, ?, ?, 'borrador', ?)`,
        [subtemaId, titulo, definicion, cuerpo, formula, v, req.user.id]
      );
      const id = ins.insertId;
      await conn.query('INSERT INTO contenido_secciones (contenido_id, numero_seccion, explicacion) VALUES (?, 1, ?)', [id, cuerpo]);

      for (const img of decodificadas) {
        const nombre = `${id}-${crypto.randomBytes(8).toString('hex')}.${img.formato}`;
        fs.mkdirSync(DIR_UPLOADS, { recursive: true });
        fs.writeFileSync(path.join(DIR_UPLOADS, nombre), img.buf);
        archivosCreados.push(nombre);
        await conn.query(
          'INSERT INTO contenido_teorico_imagenes (contenido_id, url, formato, tamano_bytes) VALUES (?, ?, ?, ?)',
          [id, `/uploads/contenido/${nombre}`, img.formato, img.buf.length]
        );
      }
      await registrarAccion(conn, req.user.id, 'creacion', 'contenido_teorico', id);
      return { id, version: Number(v) };
    });
    return res.status(201).json({ ...resultado, estado: 'borrador' });
  } catch (err) {
    for (const n of archivosCreados) { try { fs.unlinkSync(path.join(DIR_UPLOADS, n)); } catch (_) { /* ya no existe */ } }
    throw err;
  }
}

async function publicarContenido(req, res) {
  const { id } = req.params;
  const [[c]] = await pool.query('SELECT id, subtema_id, estado FROM contenido_teorico WHERE id = ? AND activo = TRUE', [id]);
  if (!c) return res.status(404).json({ error: 'Contenido no encontrado' });
  if (c.estado === 'publicado') return res.status(409).json({ error: 'Esta versión ya está publicada' });
  await conTransaccion(async (conn) => {
    await conn.query(`UPDATE contenido_teorico SET estado = 'publicado', fecha_publicacion = ${AHORA_MX} WHERE id = ?`, [id]);
    await registrarAccion(conn, req.user.id, 'publicacion', 'contenido_teorico', Number(id));
  });
  return res.json({ id: Number(id), estado: 'publicado' });
}

async function eliminarContenido(req, res) {
  const { id } = req.params;
  const [[c]] = await pool.query('SELECT id FROM contenido_teorico WHERE id = ? AND activo = TRUE', [id]);
  if (!c) return res.status(404).json({ error: 'Contenido no encontrado' });
  await conTransaccion(async (conn) => {
    await conn.query('UPDATE contenido_teorico SET activo = FALSE WHERE id = ?', [id]);
    await registrarAccion(conn, req.user.id, 'eliminacion', 'contenido_teorico', Number(id));
  });
  return res.json({ id: Number(id), eliminado: true });
}

module.exports = { listarContenido, obtenerContenido, crearVersionContenido, publicarContenido, eliminarContenido };

const pool = require('../config/db');

/**
 * RQF35 / RQNF46: registra una acción administrativa dentro de LA MISMA
 * transacción que la operación principal. Si cualquiera de las dos falla se
 * revierte todo, así nunca queda contenido modificado sin rastro (ni un
 * rastro de algo que no ocurrió).
 *
 * La fecha se guarda en UTC-6 (hora de México centro, sin horario de verano).
 */
async function registrarAccion(conn, usuarioId, tipoAccion, tipoContenido, contenidoId) {
  await conn.query(
    `INSERT INTO bitacora_auditoria (usuario_id, tipo_accion, tipo_contenido, contenido_id, registrado_en)
     VALUES (?, ?, ?, ?, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR))`,
    [usuarioId, tipoAccion, tipoContenido, contenidoId]
  );
}

/**
 * Ejecuta `fn(conn)` dentro de una transacción. Si lanza, hace rollback y
 * relanza el error. Devuelve lo que devuelva `fn`.
 */
async function conTransaccion(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await fn(conn);
    await conn.commit();
    return resultado;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Expresión SQL de "ahora" en UTC-6 (RQF35 / RQNF44).
const AHORA_MX = 'DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)';

module.exports = { registrarAccion, conTransaccion, AHORA_MX };

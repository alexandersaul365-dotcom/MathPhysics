const pool = require('../config/db');
const { verificarToken, hashToken } = require('../utils/tokens');

/**
 * Verifica el JWT, confirma que la sesión sigue viva en sesiones_jwt
 * (RQNF6: logout borra la fila -> token queda invalidado de inmediato),
 * y si el usuario es admin, aplica la expiración por inactividad (RQNF35).
 */
async function autenticar(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  let payload;
  try {
    payload = verificarToken(token);
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  const tokenHash = hashToken(token);
  const [rows] = await pool.query(
    'SELECT id, usuario_id, (expira_en < NOW()) AS vencida, TIMESTAMPDIFF(SECOND, ultima_actividad, NOW()) AS seg_inactivo FROM sesiones_jwt WHERE token_hash = ?',
    [tokenHash]
  );
  const sesion = rows[0];

  if (!sesion) {
    // La sesión ya no existe: fue invalidada por logout o nunca existió.
    return res.status(401).json({ error: 'Sesión inválida, inicia sesión de nuevo' });
  }

  // Las comparaciones de tiempo se hacen en SQL (mismo reloj/zona que las columnas).
  if (sesion.vencida) {
    await pool.query('DELETE FROM sesiones_jwt WHERE id = ?', [sesion.id]);
    return res.status(401).json({ error: 'Sesión expirada, inicia sesión de nuevo' });
  }

  // RQNF35: la sesión de administrador expira tras 30 min de inactividad.
  if (payload.rol === 'admin') {
    const minutosInactivo = Number(sesion.seg_inactivo) / 60;
    const limite = Number(process.env.ADMIN_INACTIVIDAD_MINUTOS || 30);

    if (minutosInactivo > limite) {
      await pool.query('DELETE FROM sesiones_jwt WHERE id = ?', [sesion.id]);
      return res.status(401).json({ error: 'Sesión de administrador expirada por inactividad' });
    }

    await pool.query('UPDATE sesiones_jwt SET ultima_actividad = NOW() WHERE id = ?', [sesion.id]);
  }

  req.user = { id: payload.id, rol: payload.rol };
  req.tokenHash = tokenHash;
  next();
}

// RQNF34: rol diferenciado verificado en cada petición vía middleware.
function requiereAdmin(req, res, next) {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ error: 'Requiere permisos de administrador' });
  }
  next();
}

// RQNF48: permisos finos para administradores (p.ej. ver_reportes), verificados
// en el servidor contra la tabla permisos_admin en cada petición.
function requierePermiso(permiso) {
  return async function (req, res, next) {
    const [rows] = await pool.query(
      'SELECT 1 AS ok FROM permisos_admin WHERE usuario_id = ? AND permiso = ?',
      [req.user.id, permiso]
    );
    if (rows.length === 0) {
      return res.status(403).json({ error: `Requiere el permiso ${permiso}` });
    }
    next();
  };
}

// La identidad SIEMPRE sale del token, nunca de lo que mande el cliente.
// - Si la ruta trae :usuarioId y no coincide con el del token -> 403.
// - usuario_id en query/body se sobrescribe con el del token, así ningún
//   usuario puede leer ni escribir datos de otro mandando un id ajeno.
// Debe usarse DESPUÉS de autenticar y por ruta (no con router.use), porque
// los parámetros de ruta solo existen cuando la ruta ya hizo match.
function usuarioDelToken(req, res, next) {
  if (req.params.usuarioId !== undefined && Number(req.params.usuarioId) !== req.user.id) {
    return res.status(403).json({ error: 'No puedes consultar datos de otro usuario' });
  }
  req.query.usuario_id = String(req.user.id);
  if (req.body && typeof req.body === 'object') req.body.usuario_id = req.user.id;
  next();
}

module.exports = { autenticar, requiereAdmin, requierePermiso, usuarioDelToken };

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
    'SELECT id, usuario_id, expira_en, ultima_actividad FROM sesiones_jwt WHERE token_hash = ?',
    [tokenHash]
  );
  const sesion = rows[0];

  if (!sesion) {
    // La sesión ya no existe: fue invalidada por logout o nunca existió.
    return res.status(401).json({ error: 'Sesión inválida, inicia sesión de nuevo' });
  }

  if (new Date(sesion.expira_en) < new Date()) {
    await pool.query('DELETE FROM sesiones_jwt WHERE id = ?', [sesion.id]);
    return res.status(401).json({ error: 'Sesión expirada, inicia sesión de nuevo' });
  }

  // RQNF35: la sesión de administrador expira tras 30 min de inactividad.
  if (payload.rol === 'admin') {
    const minutosInactivo =
      (Date.now() - new Date(sesion.ultima_actividad).getTime()) / 60000;
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

module.exports = { autenticar, requiereAdmin };

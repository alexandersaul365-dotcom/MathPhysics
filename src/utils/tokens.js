const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// RQNF4: el JWT contiene el id del usuario y su rol, firmado con clave secreta en el servidor.
// jti aleatorio: sin esto, dos tokens firmados para el mismo usuario dentro
// del mismo segundo (p.ej. registro con auto-login seguido de un login) dan
// exactamente el mismo payload {id, rol, iat} -> mismo JWT -> mismo hash ->
// choca con el UNIQUE de sesiones_jwt.token_hash (bug real, encontrado probando).
function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, rol: usuario.rol, jti: crypto.randomBytes(16).toString('hex') },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function verificarToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

// Nunca se guarda el JWT en claro en la base de datos, solo su hash (RQNF6).
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { firmarToken, verificarToken, hashToken };

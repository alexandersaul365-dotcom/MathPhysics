const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// RQNF4: el JWT contiene el id del usuario y su rol, firmado con clave secreta en el servidor.
function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, rol: usuario.rol },
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

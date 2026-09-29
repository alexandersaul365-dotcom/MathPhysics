const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { firmarToken, hashToken } = require('../utils/tokens');

const BCRYPT_ROUNDS = 10;
const MAX_INTENTOS = Number(process.env.LOGIN_MAX_INTENTOS || 5);
const BLOQUEO_MINUTOS = Number(process.env.LOGIN_BLOQUEO_MINUTOS || 15);

// RQF1 / RQNF1-3
async function registrar(req, res) {
  const { nombre_usuario, password } = req.body;

  if (typeof nombre_usuario !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'nombre_usuario y password son requeridos' });
  }
  if (nombre_usuario.length < 4 || nombre_usuario.length > 20) {
    return res.status(400).json({ error: 'El nombre de usuario debe tener entre 4 y 20 caracteres' });
  }
  if (password.length < 8 || password.length > 64) {
    return res.status(400).json({ error: 'La contraseña debe tener entre 8 y 64 caracteres' });
  }

  const [existentes] = await pool.query(
    'SELECT id FROM usuarios WHERE nombre_usuario = ?',
    [nombre_usuario]
  );
  if (existentes.length > 0) {
    return res.status(409).json({ error: 'Ese nombre de usuario ya está registrado' });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const [resultado] = await pool.query(
    'INSERT INTO usuarios (nombre_usuario, password_hash, rol) VALUES (?, ?, "estudiante")',
    [nombre_usuario, passwordHash]
  );

  await pool.query('INSERT INTO xp_usuario (usuario_id, total) VALUES (?, 0)', [resultado.insertId]);
  await pool.query('INSERT INTO rachas (usuario_id, dias_consecutivos) VALUES (?, 0)', [resultado.insertId]);

  return res.status(201).json({
    id: resultado.insertId,
    nombre_usuario,
  });
}

// RQF2-3 / RQNF4-5
async function iniciarSesion(req, res) {
  const { nombre_usuario, password } = req.body;

  if (typeof nombre_usuario !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'nombre_usuario y password son requeridos' });
  }

  const [rows] = await pool.query(
    'SELECT id, nombre_usuario, password_hash, rol, intentos_fallidos, bloqueado_hasta FROM usuarios WHERE nombre_usuario = ?',
    [nombre_usuario]
  );
  const usuario = rows[0];

  // Mismo mensaje genérico si el usuario no existe, para no revelar qué campo falló.
  if (!usuario) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  const ahora = new Date();
  const bloqueadoHasta = usuario.bloqueado_hasta ? new Date(usuario.bloqueado_hasta) : null;

  if (bloqueadoHasta && bloqueadoHasta > ahora) {
    const minutosRestantes = Math.ceil((bloqueadoHasta - ahora) / 60000);
    return res.status(423).json({
      error: 'Cuenta bloqueada temporalmente por seguridad',
      minutos_restantes: minutosRestantes,
    });
  }

  const passwordValido = await bcrypt.compare(password, usuario.password_hash);

  if (!passwordValido) {
    const nuevosIntentos = usuario.intentos_fallidos + 1;

    if (nuevosIntentos >= MAX_INTENTOS) {
      const bloqueoHasta = new Date(ahora.getTime() + BLOQUEO_MINUTOS * 60000);
      await pool.query(
        'UPDATE usuarios SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id = ?',
        [nuevosIntentos, bloqueoHasta, usuario.id]
      );
      return res.status(423).json({
        error: 'Cuenta bloqueada temporalmente por seguridad',
        minutos_restantes: BLOQUEO_MINUTOS,
      });
    }

    await pool.query('UPDATE usuarios SET intentos_fallidos = ? WHERE id = ?', [nuevosIntentos, usuario.id]);
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  // Login correcto: reinicia el contador de intentos (RQNF5) y el bloqueo.
  await pool.query(
    'UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?',
    [usuario.id]
  );

  const token = firmarToken(usuario);
  const tokenHash = hashToken(token);
  const expiraEn = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días

  await pool.query(
    'INSERT INTO sesiones_jwt (usuario_id, token_hash, expira_en, ultima_actividad) VALUES (?, ?, ?, NOW())',
    [usuario.id, tokenHash, expiraEn]
  );

  return res.status(200).json({
    token,
    usuario: {
      id: usuario.id,
      nombre_usuario: usuario.nombre_usuario,
      rol: usuario.rol,
    },
  });
}

// RQF4 / RQNF6: borra únicamente la sesión de este token, sin afectar otras sesiones activas del mismo usuario.
async function cerrarSesion(req, res) {
  await pool.query('DELETE FROM sesiones_jwt WHERE token_hash = ?', [req.tokenHash]);
  return res.status(200).json({ mensaje: 'Sesión cerrada' });
}

async function perfil(req, res) {
  const [rows] = await pool.query(
    'SELECT id, nombre_usuario, rol, creado_en FROM usuarios WHERE id = ?',
    [req.user.id]
  );
  return res.status(200).json(rows[0]);
}

module.exports = { registrar, iniciarSesion, cerrarSesion, perfil };

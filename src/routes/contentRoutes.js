const express = require('express');
const {
  listarMaterias,
  listarTemas,
  listarSubtemas,
  obtenerLeccionDeSubtema,
  obtenerLeccionDeTema,
} = require('../controllers/contentController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar, usuarioDelToken } = require('../middleware/auth');

const router = express.Router();

// Todas requieren sesión; usuario_id sale del token, no del cliente.
router.use(asyncHandler(autenticar));

router.get('/materias', usuarioDelToken, asyncHandler(listarMaterias));
router.get('/temas', usuarioDelToken, asyncHandler(listarTemas));               // ?materia=matematicas|fisica
router.get('/temas/:temaId/subtemas', usuarioDelToken, asyncHandler(listarSubtemas));
router.get('/subtemas/:subtemaId/leccion', asyncHandler(obtenerLeccionDeSubtema));
router.get('/temas/:temaId/leccion', asyncHandler(obtenerLeccionDeTema)); // ruta vieja, se deja por compatibilidad

module.exports = router;

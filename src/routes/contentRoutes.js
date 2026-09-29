const express = require('express');
const {
  listarMaterias,
  listarTemas,
  listarSubtemas,
  obtenerLeccionDeSubtema,
  obtenerLeccionDeTema,
} = require('../controllers/contentController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Sin autenticación por ahora (el login se integra al final del proyecto).
router.get('/materias', asyncHandler(listarMaterias));
router.get('/temas', asyncHandler(listarTemas));               // ?materia=matematicas|fisica
router.get('/temas/:temaId/subtemas', asyncHandler(listarSubtemas));
router.get('/subtemas/:subtemaId/leccion', asyncHandler(obtenerLeccionDeSubtema));
router.get('/temas/:temaId/leccion', asyncHandler(obtenerLeccionDeTema)); // ruta vieja, se deja por compatibilidad

module.exports = router;

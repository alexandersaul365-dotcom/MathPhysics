const express = require('express');
const {
  listarSubtemasConEjercicios,
  generarEjercicio,
  listarEjerciciosPorSubtema,
  obtenerEjercicioPorId,
  responderEjercicio,
} = require('../controllers/exerciseController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/disponibles', asyncHandler(listarSubtemasConEjercicios));
router.post('/generar', asyncHandler(generarEjercicio));
router.get('/subtema/:subtemaId', asyncHandler(listarEjerciciosPorSubtema));
router.get('/:ejercicioId', asyncHandler(obtenerEjercicioPorId));
router.post('/:ejercicioId/responder', asyncHandler(responderEjercicio));

module.exports = router;

const express = require('express');
const {
  listarSubtemasConEjercicios,
  generarEjercicio,
  listarEjerciciosPorSubtema,
  obtenerEjercicioPorId,
  responderEjercicio,
} = require('../controllers/exerciseController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar, requiereAdmin, usuarioDelToken } = require('../middleware/auth');

const router = express.Router();

router.use(asyncHandler(autenticar));

router.get('/disponibles', asyncHandler(listarSubtemasConEjercicios));
// Utilidad de pruebas: crea filas en la BD, así que solo administradores.
router.post('/generar', requiereAdmin, asyncHandler(generarEjercicio));
router.get('/subtema/:subtemaId', asyncHandler(listarEjerciciosPorSubtema));
router.get('/:ejercicioId', asyncHandler(obtenerEjercicioPorId));
router.post('/:ejercicioId/responder', usuarioDelToken, asyncHandler(responderEjercicio));

module.exports = router;

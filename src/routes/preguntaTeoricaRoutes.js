const express = require('express');
const { listarPorSubtema, responder } = require('../controllers/preguntaTeoricaController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar, usuarioDelToken } = require('../middleware/auth');

const router = express.Router();

router.use(asyncHandler(autenticar));

// Crear/editar/eliminar preguntas ahora vive en /api/admin/preguntas-teoricas
// (RQF26, solo administradores, con bitácora de auditoría).
router.get('/subtema/:subtemaId', asyncHandler(listarPorSubtema));
router.post('/:preguntaId/responder', usuarioDelToken, asyncHandler(responder));

module.exports = router;

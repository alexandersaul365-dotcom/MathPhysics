const express = require('express');
const { crear, listarPorSubtema, responder } = require('../controllers/preguntaTeoricaController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/', asyncHandler(crear));
router.get('/subtema/:subtemaId', asyncHandler(listarPorSubtema));
router.post('/:preguntaId/responder', asyncHandler(responder));

module.exports = router;

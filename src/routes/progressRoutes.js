const express = require('express');
const {
  obtenerRacha,
  obtenerRecompensas,
  obtenerInsignias,
  obtenerRepaso,
  obtenerRanking,
} = require('../controllers/progressController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/racha/:usuarioId', asyncHandler(obtenerRacha));
router.get('/recompensas/:usuarioId', asyncHandler(obtenerRecompensas));
router.get('/insignias/:usuarioId', asyncHandler(obtenerInsignias));
router.get('/repaso/:usuarioId', asyncHandler(obtenerRepaso));
router.get('/ranking', asyncHandler(obtenerRanking));

module.exports = router;

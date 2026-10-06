const express = require('express');
const {
  obtenerRacha,
  obtenerRecompensas,
  obtenerInsignias,
  obtenerRepaso,
  obtenerRanking,
} = require('../controllers/progressController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar, usuarioDelToken } = require('../middleware/auth');

const router = express.Router();

// OJO: este router está montado en /api, así que NO se usa router.use(autenticar)
// aquí (interceptaría rutas de otros routers); se aplica por ruta.
const auth = asyncHandler(autenticar);

router.get('/racha/:usuarioId', auth, usuarioDelToken, asyncHandler(obtenerRacha));
router.get('/recompensas/:usuarioId', auth, usuarioDelToken, asyncHandler(obtenerRecompensas));
router.get('/insignias/:usuarioId', auth, usuarioDelToken, asyncHandler(obtenerInsignias));
router.get('/repaso/:usuarioId', auth, usuarioDelToken, asyncHandler(obtenerRepaso));
router.get('/ranking', auth, usuarioDelToken, asyncHandler(obtenerRanking));

module.exports = router;

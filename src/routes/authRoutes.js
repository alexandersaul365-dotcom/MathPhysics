const express = require('express');
const { registrar, iniciarSesion, cerrarSesion, perfil } = require('../controllers/authController');
const { autenticar } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/registro', asyncHandler(registrar));
router.post('/login', asyncHandler(iniciarSesion));
router.post('/logout', asyncHandler(autenticar), asyncHandler(cerrarSesion));
router.get('/perfil', asyncHandler(autenticar), asyncHandler(perfil));

module.exports = router;

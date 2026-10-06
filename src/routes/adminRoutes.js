const express = require('express');
const { autenticar, requiereAdmin, requierePermiso } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const c = require('../controllers/adminContenidoController');
const t = require('../controllers/adminTeoriaController');
const rep = require('../controllers/adminReportesController');

const router = express.Router();
const h = (fn) => asyncHandler(c.conValidacion(fn)); // asyncHandler + errores de validación -> 4xx

// RQF25 / RQNF34: toda la API de administración exige sesión válida Y rol admin.
router.use(asyncHandler(autenticar), requiereAdmin);

router.get('/perfil', h(c.perfilAdmin));
router.get('/catalogo', h(c.catalogo));

// Preguntas teóricas (RQF26)
router.get('/preguntas-teoricas', h(c.listarPreguntas));
router.post('/preguntas-teoricas', h(c.crearPregunta));
router.get('/preguntas-teoricas/:id', h(c.obtenerPregunta));
router.put('/preguntas-teoricas/:id', h(c.editarPregunta));
router.post('/preguntas-teoricas/:id/publicar', h(c.publicarPregunta));
router.delete('/preguntas-teoricas/:id', h(c.eliminarPregunta));

// Ejercicios (RQF27-31). Las rutas fijas van antes que las de :id.
router.post('/ejercicios/paso-a-paso/previsualizar', h(c.previsualizarPasos));
router.post('/ejercicios/paso-a-paso', h(c.crearPasoAPaso));
router.get('/ejercicios', h(c.listarEjercicios));
router.post('/ejercicios', h(c.crearEjercicio));
router.get('/ejercicios/:id', h(c.obtenerEjercicio));
router.put('/ejercicios/:id', h(c.editarEjercicio));
router.post('/ejercicios/:id/publicar', h(c.publicarEjercicio));
router.delete('/ejercicios/:id', h(c.eliminarEjercicio));

// Contenido teórico por subtema (RQF34)
router.get('/contenido', h(t.listarContenido));
router.post('/contenido', h(t.crearVersionContenido));
router.get('/contenido/:id', h(t.obtenerContenido));
router.post('/contenido/:id/publicar', h(t.publicarContenido));
router.delete('/contenido/:id', h(t.eliminarContenido));

// Bitácora (RQF35)
router.get('/bitacora', h(rep.listarBitacora));

// Reportes (RQF36): además del rol, exigen el permiso ver_reportes (RQNF48).
const permisoReportes = asyncHandler(requierePermiso('ver_reportes'));
router.get('/reportes/temas', permisoReportes, h(rep.reportePorTema));
router.get('/reportes/estudiantes', permisoReportes, h(rep.reportePorEstudiante));
router.get('/reportes/estudiantes/:id', permisoReportes, h(rep.detalleEstudiante));

module.exports = router;

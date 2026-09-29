// Express 4 no captura rechazos de promesas automáticamente; este wrapper evita
// tener que poner try/catch en cada controlador.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;

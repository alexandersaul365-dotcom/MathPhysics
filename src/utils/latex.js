const katex = require('katex');

/**
 * Compila una fórmula LaTeX con KaTeX para validar su sintaxis (RQNF36c).
 * Lanza un Error con mensaje legible si la fórmula no es válida.
 * No usamos el HTML resultante en el servidor — solo confirmamos que
 * compila, porque el renderizado real ocurre en el WebView de Android.
 */
function validarLatex(formula) {
  if (!formula) return; // las fórmulas son opcionales (RQNF36c)
  try {
    katex.renderToString(formula, { throwOnError: true, strict: 'ignore' });
  } catch (err) {
    throw new Error(`Fórmula LaTeX inválida: ${err.message}`);
  }
}

module.exports = { validarLatex };

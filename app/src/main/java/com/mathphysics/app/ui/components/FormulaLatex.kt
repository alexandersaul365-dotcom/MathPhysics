package com.mathphysics.app.ui.components

import android.annotation.SuppressLint
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.mathphysics.app.ui.theme.TextoPrimario

/**
 * Renderiza una fórmula LaTeX real usando KaTeX (vía WebView) — no es una
 * aproximación con símbolos Unicode, es tipografía matemática de verdad
 * (fracciones, exponentes, raíces, etc.), igual que exige RQNF10/RQNF36c.
 *
 * Requiere conexión a internet la primera vez que carga KaTeX desde su CDN.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun FormulaLatex(latex: String, modifier: Modifier = Modifier) {
    val density = LocalDensity.current
    var alturaPx by remember(latex) { mutableIntStateOf(with(density) { 40.dp.roundToPx() }) }
    val colorTexto = TextoPrimario
    val latexActualizado by rememberUpdatedState(latex)

    AndroidView(
        modifier = modifier
            .fillMaxWidth()
            .height(with(density) { alturaPx.toDp() }),
        factory = { contexto ->
            val webView = WebView(contexto)
            webView.settings.javaScriptEnabled = true
            webView.setBackgroundColor(android.graphics.Color.TRANSPARENT)
            webView.addJavascriptInterface(
                object {
                    @JavascriptInterface
                    fun reportarAltura(alturaCss: Float) {
                        // Corre en un hilo de JS, hay que volver al hilo principal para tocar estado de Compose.
                        webView.post {
                            val nuevaAlturaPx = with(density) { (alturaCss.dp + 8.dp).roundToPx() }
                            alturaPx = nuevaAlturaPx.coerceAtLeast(with(density) { 30.dp.roundToPx() })
                        }
                    }
                },
                "AlturaListener",
            )
            webView
        },
        update = { webView ->
            val yaCargado = webView.tag as? String
            if (yaCargado == latexActualizado) return@AndroidView

            val colorHex = String.format("#%06X", 0xFFFFFF and colorTexto.toArgb())
            val latexEscapado = latexActualizado
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", " ")

            val html = """
                <!DOCTYPE html>
                <html>
                <head>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
                  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
                  <style>
                    html, body { margin:0; padding:0; background: transparent; overflow: hidden; }
                    #contenedor { padding: 10px 4px; text-align: center; }
                    #formula { display: inline-block; color: $colorHex; font-size: 19px; }
                  </style>
                </head>
                <body>
                  <div id="contenedor"><div id="formula"></div></div>
                  <script>
                    try {
                      katex.render("$latexEscapado", document.getElementById('formula'), { throwOnError: false, displayMode: true });
                    } catch (e) {
                      document.getElementById('formula').innerText = "$latexEscapado";
                    }

                    // Si la fórmula es más ancha que la pantalla, la encoge hasta
                    // que quepa completa, en vez de dejarla cortada.
                    function ajustarTamano() {
                      var formula = document.getElementById('formula');
                      var anchoDisponible = document.body.clientWidth - 16;
                      var anchoFormula = formula.scrollWidth;
                      if (anchoFormula > anchoDisponible && anchoFormula > 0) {
                        var escala = Math.max(anchoDisponible / anchoFormula, 0.45);
                        formula.style.transform = 'scale(' + escala + ')';
                        formula.style.transformOrigin = 'center top';
                      }
                    }

                    function avisarAltura() {
                      var h = document.getElementById('contenedor').getBoundingClientRect().height;
                      if (window.AlturaListener) window.AlturaListener.reportarAltura(h);
                    }

                    ajustarTamano();
                    avisarAltura();
                    setTimeout(function() { ajustarTamano(); avisarAltura(); }, 200);
                  </script>
                </body>
                </html>
            """.trimIndent()

            webView.tag = latexActualizado
            webView.loadDataWithBaseURL("https://cdn.jsdelivr.net", html, "text/html", "UTF-8", null)
        },
    )
}

package com.mathphysics.app.ui.theme

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * Estado global de modo oscuro/claro. Los tokens de color en Color.kt leen
 * [modoOscuro] para decidir qué versión mostrar — así cualquier pantalla que
 * ya use esos tokens (Teal, Fondo, TextoPrimario, etc.) se adapta sola, sin
 * tener que tocar cada archivo uno por uno.
 */
object AppTheme {
    var modoOscuro by mutableStateOf(false)
}

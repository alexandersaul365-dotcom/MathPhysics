package com.mathphysics.app.ui.exercises

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import com.mathphysics.app.data.model.Ejercicio
import com.mathphysics.app.data.model.RespuestaResultado

@Composable
fun EjercicioContent(
    ejercicio: Ejercicio,
    resultado: RespuestaResultado?,
    onResponder: (Map<String, Any>, Int) -> Unit,
    onSiguiente: () -> Unit,
) {
    when (ejercicio.tipo) {
        "opcion_multiple" -> OpcionMultipleContent(ejercicio, resultado, onResponder, onSiguiente)
        "numerico", "variable" -> NumericoContent(ejercicio, resultado, onResponder, onSiguiente)
        "simulacion" -> SimulacionContent(ejercicio, resultado, onResponder, onSiguiente)
        "paso_a_paso" -> PasoAPasoContent(ejercicio, resultado, onResponder, onSiguiente)
        else -> Text("Tipo de ejercicio no soportado: ${ejercicio.tipo}")
    }
}

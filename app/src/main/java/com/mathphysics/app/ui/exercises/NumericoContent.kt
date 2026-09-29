package com.mathphysics.app.ui.exercises

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mathphysics.app.data.model.Ejercicio
import com.mathphysics.app.data.model.RespuestaResultado
import com.mathphysics.app.ui.theme.*

@Composable
fun NumericoContent(
    ejercicio: Ejercicio,
    resultado: RespuestaResultado?,
    onResponder: (Map<String, Any>, Int) -> Unit,
    onSiguiente: () -> Unit,
) {
    var respuesta by remember(ejercicio.id) { mutableStateOf("") }
    val inicioMs = remember(ejercicio.id) { System.currentTimeMillis() }
    val respondido = resultado != null

    Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = TealLight,
            border = BorderStroke(1.dp, Teal.copy(alpha = 0.25f)),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(ejercicio.enunciado, modifier = Modifier.padding(16.dp), color = TextoPrimario, style = MaterialTheme.typography.bodyMedium)
        }

        Spacer(Modifier.height(20.dp))

        Text("TU RESPUESTA (${ejercicio.unidad ?: ""})", style = MaterialTheme.typography.bodySmall, color = Teal, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(6.dp))

        OutlinedTextField(
            value = respuesta,
            onValueChange = { respuesta = it },
            enabled = !respondido,
            singleLine = true,
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Decimal),
            textStyle = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, color = TextoPrimario),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Teal,
                unfocusedBorderColor = Teal.copy(alpha = 0.5f),
            ),
            shape = RoundedCornerShape(12.dp),
            leadingIcon = {
                // El teclado decimal de Android no trae signo negativo por
                // defecto — este botón permite escribir respuestas negativas.
                TextButton(onClick = { respuesta = if (respuesta.startsWith("-")) respuesta.removePrefix("-") else "-$respuesta" }, enabled = !respondido) {
                    Text("±", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Teal)
                }
            },
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(16.dp))

        Button(
            onClick = {
                if (!respondido) {
                    respuesta.replace(",", ".").toDoubleOrNull()?.let {
                        val segundos = ((System.currentTimeMillis() - inicioMs) / 1000).toInt()
                        onResponder(mapOf("valor" to it), segundos)
                    }
                } else {
                    onSiguiente()
                }
            },
            enabled = respondido || respuesta.isNotBlank(),
            colors = ButtonDefaults.buttonColors(containerColor = Teal),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) {
            Text(if (respondido) "Siguiente →" else "Verificar respuesta", color = Color.White, fontWeight = FontWeight.Bold)
        }

        resultado?.let { r ->
            Spacer(Modifier.height(10.dp))
            val valorCorrecto = r.respuestaCorrecta?.get("valor")?.toString()
            val sufijoBono = if (r.correcta && r.bonoVelocidad > 1) "  ⚡ ×${r.bonoVelocidad}" else ""
            val texto = when {
                !r.correcta -> "No es correcto. La respuesta era $valorCorrecto"
                else -> "¡Correcto! +${r.xpOtorgado} XP$sufijoBono ✓"
            }
            Text(
                texto,
                color = if (r.correcta) Teal else ErrorRed,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

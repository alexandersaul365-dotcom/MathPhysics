package com.mathphysics.app.ui.exercises

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mathphysics.app.data.model.Ejercicio
import com.mathphysics.app.data.model.RespuestaResultado
import com.mathphysics.app.ui.theme.*

@Composable
fun OpcionMultipleContent(
    ejercicio: Ejercicio,
    resultado: RespuestaResultado?,
    onResponder: (Map<String, Any>, Int) -> Unit,
    onSiguiente: () -> Unit,
) {
    var seleccionada by remember(ejercicio.id) { mutableStateOf<Int?>(null) }
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

        Spacer(Modifier.height(16.dp))

        ejercicio.opciones.orEmpty().forEach { opcion ->
            val estaSeleccionada = seleccionada == opcion.id
            val esLaCorrecta = respondido && !resultado!!.correcta &&
                (resultado.respuestaCorrecta?.get("id") as? Double)?.toInt() == opcion.id

            Surface(
                shape = RoundedCornerShape(12.dp),
                color = when {
                    esLaCorrecta -> TealLight
                    estaSeleccionada -> if (respondido) (if (resultado!!.correcta) TealLight else ErrorBg) else TealLight
                    else -> Fondo
                },
                border = BorderStroke(
                    if (estaSeleccionada || esLaCorrecta) 2.dp else 1.dp,
                    when {
                        esLaCorrecta -> Teal
                        estaSeleccionada && respondido -> if (resultado!!.correcta) Teal else ErrorRed
                        estaSeleccionada -> Teal
                        else -> Borde
                    },
                ),
                modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp)
                    .clickable(enabled = !respondido) { seleccionada = opcion.id },
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(opcion.texto, color = TextoPrimario, modifier = Modifier.weight(1f))
                    if (estaSeleccionada) Icon(Icons.Default.Check, contentDescription = null, tint = Teal)
                }
            }
        }

        Spacer(Modifier.height(6.dp))

        Button(
            onClick = {
                if (!respondido) seleccionada?.let {
                    val segundos = ((System.currentTimeMillis() - inicioMs) / 1000).toInt()
                    onResponder(mapOf("opcion_id" to it), segundos)
                }
                else onSiguiente()
            },
            enabled = respondido || seleccionada != null,
            colors = ButtonDefaults.buttonColors(containerColor = Teal),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) {
            Text(if (respondido) "Siguiente →" else "Confirmar respuesta", color = Color.White, fontWeight = FontWeight.Bold)
        }

        resultado?.let { r ->
            Spacer(Modifier.height(12.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                Surface(shape = RoundedCornerShape(20.dp), color = if (r.correcta) AmberBg else ErrorBg) {
                    val sufijoBono = if (r.bonoVelocidad > 1) "  ⚡ ×${r.bonoVelocidad}" else ""
                    val texto = when {
                        !r.correcta -> "Esa no era — inténtalo distinto la próxima"
                        else -> "+${r.xpOtorgado} XP$sufijoBono"
                    }
                    Text(
                        texto,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                        color = if (r.correcta) Amber else ErrorRed,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
        }
    }
}

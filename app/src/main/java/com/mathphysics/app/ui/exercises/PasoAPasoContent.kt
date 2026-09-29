package com.mathphysics.app.ui.exercises

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.mathphysics.app.data.model.Ejercicio
import com.mathphysics.app.data.model.PasoEjercicio
import com.mathphysics.app.data.model.RespuestaResultado
import com.mathphysics.app.ui.theme.*

@Composable
fun PasoAPasoContent(
    ejercicio: Ejercicio,
    resultado: RespuestaResultado?,
    onResponder: (Map<String, Any>, Int) -> Unit,
    onSiguiente: () -> Unit,
) {
    val orden = remember(ejercicio.id) { mutableStateListOf(*ejercicio.pasos.orEmpty().toTypedArray()) }
    val inicioMs = remember(ejercicio.id) { System.currentTimeMillis() }
    val respondido = resultado != null

    val ordenCorrectoIds: List<Int>? = remember(resultado) {
        (resultado?.respuestaCorrecta?.get("orden") as? List<*>)?.mapNotNull { (it as? Double)?.toInt() }
    }

    Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
        Surface(shape = RoundedCornerShape(12.dp), color = SuperficieNeutra, modifier = Modifier.fillMaxWidth()) {
            Text(
                ejercicio.ecuacion ?: "",
                modifier = Modifier.fillMaxWidth().padding(18.dp),
                color = TextoPrimario,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
            )
        }

        Spacer(Modifier.height(16.dp))
        Text("Ordena los pasos con las flechas:", style = MaterialTheme.typography.bodySmall, color = TextoSecundario)
        Spacer(Modifier.height(10.dp))

        orden.forEachIndexed { index, paso ->
            val esCorrectaEstaPosicion = respondido && (
                resultado!!.correcta || ordenCorrectoIds?.getOrNull(index) == paso.id
            )
            PasoRow(
                numero = index + 1,
                paso = paso,
                resaltado = esCorrectaEstaPosicion,
                puedeSubir = !respondido && index > 0,
                puedeBajar = !respondido && index < orden.lastIndex,
                onSubir = { orden.add(index - 1, orden.removeAt(index)) },
                onBajar = { orden.add(index + 1, orden.removeAt(index)) },
            )
        }

        Spacer(Modifier.height(10.dp))

        Button(
            onClick = {
                if (!respondido) {
                    val segundos = ((System.currentTimeMillis() - inicioMs) / 1000).toInt()
                    onResponder(mapOf("orden" to orden.map { it.id }), segundos)
                }
                else onSiguiente()
            },
            colors = ButtonDefaults.buttonColors(containerColor = Teal),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) {
            Text(if (respondido) "Siguiente →" else "Verificar orden", color = Color.White, fontWeight = FontWeight.Bold)
        }

        resultado?.let { r ->
            Spacer(Modifier.height(10.dp))
            val texto = when {
                !r.correcta -> "Ese no era el orden — la respuesta correcta ya se resaltó arriba"
                else -> "¡Orden correcto! +${r.xpOtorgado} XP ✓"
            }
            Text(
                texto,
                color = if (r.correcta) Teal else ErrorRed,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun PasoRow(
    numero: Int,
    paso: PasoEjercicio,
    resaltado: Boolean,
    puedeSubir: Boolean,
    puedeBajar: Boolean,
    onSubir: () -> Unit,
    onBajar: () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = if (resaltado) TealLight else Fondo,
        border = BorderStroke(if (resaltado) 2.dp else 1.dp, if (resaltado) Teal else Borde),
        modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier.size(28.dp).background(if (resaltado) Teal else Borde, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text("$numero", color = if (resaltado) Color.White else TextoSecundario, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
            }
            Spacer(Modifier.width(12.dp))
            Text(paso.descripcion, color = if (resaltado) Teal else TextoPrimario, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
            Column {
                IconButton(onClick = onSubir, enabled = puedeSubir, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Default.KeyboardArrowUp, contentDescription = "Subir", tint = if (puedeSubir) Teal else Borde)
                }
                IconButton(onClick = onBajar, enabled = puedeBajar, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Default.KeyboardArrowDown, contentDescription = "Bajar", tint = if (puedeBajar) Teal else Borde)
                }
            }
        }
    }
}

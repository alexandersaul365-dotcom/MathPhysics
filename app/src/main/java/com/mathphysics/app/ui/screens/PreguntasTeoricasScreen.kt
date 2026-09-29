package com.mathphysics.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mathphysics.app.data.model.PreguntaTeorica
import com.mathphysics.app.ui.components.FormulaLatex
import com.mathphysics.app.ui.theme.*
import com.mathphysics.app.ui.viewmodel.ParametrizedViewModelFactory
import com.mathphysics.app.ui.viewmodel.PreguntasTeoricasViewModel
import com.mathphysics.app.ui.viewmodel.UiState

@Composable
fun PreguntasTeoricasScreen(
    subtemaId: Int,
    onTerminar: () -> Unit,
    onBack: () -> Unit,
) {
    val viewModel: PreguntasTeoricasViewModel = viewModel(
        factory = ParametrizedViewModelFactory { PreguntasTeoricasViewModel(subtemaId) },
    )
    val estado by viewModel.estado.collectAsState()
    val resultado by viewModel.resultado.collectAsState()

    var indice by rememberSaveable(subtemaId) { mutableStateOf(0) }
    var xpAcumulado by rememberSaveable(subtemaId) { mutableStateOf(0) }

    Scaffold(containerColor = Fondo, topBar = {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Teal)
                .padding(top = 44.dp, bottom = 20.dp, start = 4.dp, end = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Volver", tint = Color.White)
            }
            Text("Preguntas teóricas", style = MaterialTheme.typography.headlineSmall, color = Color.White)
        }
    }) { padding ->
        when (val s = estado) {
            is UiState.Cargando -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                CircularProgressIndicator(color = Teal)
            }

            is UiState.Error -> Box(Modifier.fillMaxSize().padding(padding).padding(24.dp), Alignment.Center) {
                Text(s.mensaje, color = ErrorRed, textAlign = TextAlign.Center)
            }

            is UiState.Exito -> {
                val preguntas = s.datos
                if (preguntas.isEmpty()) {
                    // No hay preguntas teóricas cargadas todavía para este subtema.
                    Box(Modifier.fillMaxSize().padding(padding).padding(24.dp), Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                "Todavía no hay preguntas teóricas para este subtema",
                                color = TextoSecundario,
                                textAlign = TextAlign.Center,
                            )
                            Spacer(Modifier.height(16.dp))
                            Button(onClick = onTerminar, colors = ButtonDefaults.buttonColors(containerColor = Teal)) {
                                Text("Volver", color = Color.White)
                            }
                        }
                    }
                } else if (indice >= preguntas.size) {
                    // Ya respondió todas — pantalla de cierre.
                    Box(Modifier.fillMaxSize().padding(padding).padding(24.dp), Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Teal, modifier = Modifier.size(56.dp))
                            Spacer(Modifier.height(12.dp))
                            Text("¡Listo!", style = MaterialTheme.typography.headlineSmall, color = TextoPrimario)
                            Spacer(Modifier.height(4.dp))
                            Text("Ganaste $xpAcumulado XP en total", color = TextoSecundario)
                            Spacer(Modifier.height(20.dp))
                            Button(
                                onClick = onTerminar,
                                colors = ButtonDefaults.buttonColors(containerColor = Teal),
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.height(52.dp),
                            ) {
                                Text("Volver a Subtemas", color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                } else {
                    Column(modifier = Modifier.padding(padding).fillMaxSize().padding(20.dp)) {
                        Text(
                            "${indice + 1} / ${preguntas.size}",
                            style = MaterialTheme.typography.bodySmall,
                            color = Teal,
                            fontWeight = FontWeight.Bold,
                        )
                        Spacer(Modifier.height(12.dp))

                        PreguntaContenido(
                            pregunta = preguntas[indice],
                            resultado = resultado,
                            onResponder = { opcionId -> viewModel.responder(preguntas[indice].id, opcionId) },
                            onSiguiente = {
                                xpAcumulado += resultado?.xpOtorgado ?: 0
                                viewModel.limpiarResultado()
                                indice++
                            },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PreguntaContenido(
    pregunta: PreguntaTeorica,
    resultado: com.mathphysics.app.data.model.RespuestaPreguntaTeoricaResultado?,
    onResponder: (Int) -> Unit,
    onSiguiente: () -> Unit,
) {
    var seleccionada by remember(pregunta.id) { mutableStateOf<Int?>(null) }
    val respondido = resultado != null

    Text(pregunta.titulo, style = MaterialTheme.typography.titleMedium, color = TextoPrimario, fontWeight = FontWeight.SemiBold)
    Spacer(Modifier.height(10.dp))

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = TealLight,
        border = BorderStroke(1.dp, Teal.copy(alpha = 0.25f)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(pregunta.cuerpo, modifier = Modifier.padding(16.dp), color = TextoPrimario, style = MaterialTheme.typography.bodyMedium)
    }

    if (!pregunta.formula.isNullOrBlank()) {
        Spacer(Modifier.height(10.dp))
        Surface(shape = RoundedCornerShape(12.dp), color = SuperficieNeutra, modifier = Modifier.fillMaxWidth()) {
            FormulaLatex(pregunta.formula, modifier = Modifier.padding(horizontal = 6.dp))
        }
    }

    Spacer(Modifier.height(16.dp))

    pregunta.opciones.forEach { opcion ->
        val estaSeleccionada = seleccionada == opcion.id
        val esLaCorrecta = respondido && !resultado!!.correcta && resultado.opcionCorrectaId == opcion.id

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
            if (!respondido) seleccionada?.let { onResponder(it) } else onSiguiente()
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
                val texto = when {
                    !r.correcta -> "Esa no era — mira la correcta arriba"
                    r.yaDominada -> "¡Correcto! Ya la habías dominado — sin XP extra"
                    else -> "+${r.xpOtorgado} XP"
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

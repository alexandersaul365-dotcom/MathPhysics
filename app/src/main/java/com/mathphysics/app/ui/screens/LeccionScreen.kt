package com.mathphysics.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mathphysics.app.data.model.Leccion
import com.mathphysics.app.data.model.Seccion
import com.mathphysics.app.ui.components.FormulaLatex
import com.mathphysics.app.ui.theme.*
import com.mathphysics.app.ui.viewmodel.LeccionViewModel
import com.mathphysics.app.ui.viewmodel.ParametrizedViewModelFactory
import com.mathphysics.app.ui.viewmodel.UiState

@Composable
fun LeccionScreen(
    subtemaId: Int,
    onIrAEjercicios: (Int) -> Unit,
    onBack: () -> Unit,
) {
    val viewModel: LeccionViewModel = viewModel(
        factory = ParametrizedViewModelFactory { LeccionViewModel(subtemaId) },
    )
    val estado by viewModel.estado.collectAsState()
    val titulo = (estado as? UiState.Exito)?.datos?.titulo ?: "Lección"

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
            Text(titulo, style = MaterialTheme.typography.headlineSmall, color = Color.White)
        }
    }) { padding ->
        when (val s = estado) {
            is UiState.Error -> Box(
                Modifier.fillMaxSize().padding(padding).padding(24.dp),
                Alignment.Center,
            ) {
                Text(s.mensaje, color = TextoSecundario, textAlign = TextAlign.Center)
            }

            is UiState.Exito -> LeccionContenido(leccion = s.datos, onIrAEjercicios = { onIrAEjercicios(s.datos.subtemaId) }, padding = padding)

            else -> Unit
        }
    }
}

@Composable
private fun LeccionContenido(leccion: Leccion, onIrAEjercicios: () -> Unit, padding: PaddingValues) {
    // Índice de la sección (página) que se está mostrando ahora. rememberSaveable
    // para que sobreviva si el usuario gira la pantalla, pero se reinicia si
    // sale y entra de nuevo a la lección.
    var indice by rememberSaveable(leccion.subtemaId) { mutableStateOf(0) }
    val secciones = leccion.secciones
    val esUltimaSeccion = secciones.isEmpty() || indice >= secciones.lastIndex

    Column(
        modifier = Modifier
            .padding(padding)
            .fillMaxSize(),
    ) {
        Text(
            leccion.breadcrumb,
            style = MaterialTheme.typography.bodySmall,
            color = TextoSecundario,
            modifier = Modifier.padding(start = 20.dp, top = 12.dp),
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
        ) {
            // Callout de definición (constante, no cambia entre páginas)
            if (!leccion.definicion.isNullOrBlank()) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = TealLight,
                    border = BorderStroke(1.dp, Teal.copy(alpha = 0.25f)),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        leccion.definicion,
                        modifier = Modifier.padding(16.dp),
                        color = TextoPrimario,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
                Spacer(Modifier.height(14.dp))
            }

            // Fórmula (constante, sirve de referencia en todas las páginas)
            if (!leccion.formula.isNullOrBlank()) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = SuperficieNeutra,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    FormulaLatex(leccion.formula, modifier = Modifier.padding(horizontal = 8.dp))
                }
                Spacer(Modifier.height(20.dp))
            }

            if (secciones.isNotEmpty()) {
                // Indicador de página: "1 / 2"
                Text(
                    "${indice + 1} / ${secciones.size}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Teal,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(8.dp))

                SeccionContenido(secciones[indice])
            }
        }

        // Navegación: Anterior / Siguiente — Ir a ejercicios en la última página
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (indice > 0) {
                OutlinedButton(
                    onClick = { indice-- },
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Teal),
                    border = BorderStroke(1.dp, Teal),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.weight(1f).height(52.dp),
                ) {
                    Text("← Anterior", fontWeight = FontWeight.Bold)
                }
            }

            Button(
                onClick = {
                    if (esUltimaSeccion) onIrAEjercicios() else indice++
                },
                colors = ButtonDefaults.buttonColors(containerColor = Teal),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.weight(1f).height(52.dp),
            ) {
                Text(if (esUltimaSeccion) "Ir a ejercicios →" else "Siguiente →", color = Color.White, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun SeccionContenido(seccion: Seccion) {
    Text(
        seccion.explicacion,
        color = TextoPrimario,
        style = MaterialTheme.typography.bodyMedium,
    )

    Spacer(Modifier.height(20.dp))

    if (seccion.pasos.isNotEmpty()) {
        Text("Ejemplo resuelto", style = MaterialTheme.typography.titleMedium, color = TextoPrimario)
        Spacer(Modifier.height(10.dp))

        seccion.pasos.forEach { paso ->
            Text(
                text = if (paso.esFinal) "${paso.texto}  ✓" else paso.texto,
                color = if (paso.esFinal) Teal else TextoSecundario,
                fontWeight = if (paso.esFinal) FontWeight.Bold else FontWeight.Normal,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(vertical = 4.dp),
            )
        }
    }
}

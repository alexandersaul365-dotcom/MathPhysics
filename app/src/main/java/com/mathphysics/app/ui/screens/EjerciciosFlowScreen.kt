package com.mathphysics.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mathphysics.app.ui.components.BottomNavBar
import com.mathphysics.app.ui.components.SeccionNav
import com.mathphysics.app.ui.exercises.EjercicioContent
import com.mathphysics.app.ui.theme.*
import com.mathphysics.app.ui.viewmodel.EjerciciosFlowViewModel
import com.mathphysics.app.ui.viewmodel.ParametrizedViewModelFactory
import com.mathphysics.app.ui.viewmodel.UiState

@Composable
fun EjerciciosFlowScreen(
    subtemaId: Int,
    onBack: () -> Unit,
    onTerminado: () -> Unit,
) {
    val viewModel: EjerciciosFlowViewModel = viewModel(
        factory = ParametrizedViewModelFactory { EjerciciosFlowViewModel(subtemaId) },
    )
    val estado by viewModel.estado.collectAsState()

    Scaffold(
        containerColor = Fondo,
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Teal)
                    .padding(top = 44.dp, start = 12.dp, end = 12.dp, bottom = 16.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Volver", tint = Color.White)
                    }
                    Column {
                        Text("Ejercicio", style = MaterialTheme.typography.headlineSmall, color = Color.White)
                        val s = estado
                        if (s is UiState.Exito) {
                            Text(
                                "${s.datos.indiceActual + 1} / ${s.datos.ejercicios.size}",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White.copy(alpha = 0.8f),
                            )
                        }
                    }
                }
                val s = estado
                if (s is UiState.Exito) {
                    Spacer(Modifier.height(8.dp))
                    Box(Modifier.fillMaxWidth().height(4.dp).background(Color.White.copy(alpha = 0.3f), RoundedCornerShape(2.dp))) {
                        Box(
                            Modifier
                                .fillMaxHeight()
                                .fillMaxWidth((s.datos.indiceActual + 1) / s.datos.ejercicios.size.toFloat())
                                .background(Color.White, RoundedCornerShape(2.dp)),
                        )
                    }
                }
            }
        },
        bottomBar = { BottomNavBar(SeccionNav.EJERCICIOS) },
    ) { padding ->
        when (val s = estado) {
            is UiState.Cargando -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                CircularProgressIndicator(color = Teal)
            }

            is UiState.Error -> Box(Modifier.fillMaxSize().padding(padding).padding(24.dp), Alignment.Center) {
                Text(s.mensaje, color = TextoSecundario, textAlign = TextAlign.Center)
            }

            is UiState.Exito -> {
                val flujo = s.datos
                val ejercicioActual = flujo.ejercicioActual
                if (ejercicioActual == null) {
                    Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                        Text("No hay más ejercicios", color = TextoSecundario)
                    }
                } else {
                    Box(Modifier.padding(padding)) {
                        EjercicioContent(
                            ejercicio = ejercicioActual,
                            resultado = flujo.resultadoActual,
                            onResponder = { respuesta, tiempoSegundos -> viewModel.responder(respuesta, tiempoSegundos) },
                            onSiguiente = {
                                if (!viewModel.siguiente()) onTerminado()
                            },
                        )
                    }
                }
            }
        }
    }
}

package com.mathphysics.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mathphysics.app.data.model.ErrorPendiente
import com.mathphysics.app.ui.components.BottomNavBar
import com.mathphysics.app.ui.components.OnResumeEffect
import com.mathphysics.app.ui.components.SeccionNav
import com.mathphysics.app.ui.theme.*
import com.mathphysics.app.ui.viewmodel.RepasoViewModel
import com.mathphysics.app.ui.viewmodel.UiState

@Composable
fun RepasoErroresScreen(
    onBack: () -> Unit,
    onReintentar: (ErrorPendiente) -> Unit,
    viewModel: RepasoViewModel = viewModel(),
) {
    val estado by viewModel.estado.collectAsState()
    OnResumeEffect { viewModel.cargar() }

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
                        Text("Repaso de Errores", style = MaterialTheme.typography.headlineSmall, color = Color.White)
                        Text("Ejercicios que debes repasar", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.8f))
                    }
                }
            }
        },
        bottomBar = { BottomNavBar(SeccionNav.REPASO) },
    ) { padding ->
        when (val s = estado) {
            is UiState.Cargando -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                CircularProgressIndicator(color = Teal)
            }

            is UiState.Error -> Box(Modifier.fillMaxSize().padding(padding).padding(24.dp), Alignment.Center) {
                Text(s.mensaje, color = TextoSecundario, textAlign = TextAlign.Center)
            }

            is UiState.Exito -> {
                val errores = s.datos
                Column(modifier = Modifier.padding(padding).padding(20.dp)) {
                    if (errores.isEmpty()) {
                        Text("¡No tienes ejercicios pendientes de repasar! 🎉", color = TextoSecundario)
                    } else {
                        Text("${errores.size} ejercicios pendientes", style = MaterialTheme.typography.bodySmall, color = TextoSecundario)
                        Spacer(Modifier.height(12.dp))
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            items(errores) { error ->
                                ErrorCard(error, onReintentar = { onReintentar(error) })
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ErrorCard(error: ErrorPendiente, onReintentar: () -> Unit) {
    Surface(shape = RoundedCornerShape(12.dp), color = Superficie, border = BorderStroke(1.dp, Borde), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp)) {
            Text(error.tema, color = Teal, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(4.dp))
            Text(error.enunciado, color = TextoPrimario, style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Surface(shape = RoundedCornerShape(8.dp), color = ErrorBg) {
                    Text("✗ ${error.respuestaResumen}", modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), color = ErrorRed, style = MaterialTheme.typography.bodySmall)
                }
                Spacer(Modifier.weight(1f))
                OutlinedButton(
                    onClick = onReintentar,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Teal),
                    border = BorderStroke(1.dp, Teal),
                    shape = RoundedCornerShape(10.dp),
                ) {
                    Text("Reintentar", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

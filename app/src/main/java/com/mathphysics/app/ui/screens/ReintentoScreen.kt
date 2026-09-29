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
import com.mathphysics.app.ui.viewmodel.ParametrizedViewModelFactory
import com.mathphysics.app.ui.viewmodel.ReintentoViewModel
import com.mathphysics.app.ui.viewmodel.UiState

@Composable
fun ReintentoScreen(
    ejercicioId: Int,
    respuestaAnterior: String,
    onBack: () -> Unit,
    onExito: () -> Unit,
) {
    val viewModel: ReintentoViewModel = viewModel(
        factory = ParametrizedViewModelFactory { ReintentoViewModel(ejercicioId) },
    )
    val estado by viewModel.estado.collectAsState()
    val resultado by viewModel.resultado.collectAsState()

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
                        Text("Repaso", style = MaterialTheme.typography.headlineSmall, color = Color.White)
                        Text("Reintentando ejercicio fallado", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.8f))
                    }
                }
            }
        },
        bottomBar = { BottomNavBar(SeccionNav.REPASO) },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            Surface(shape = RoundedCornerShape(10.dp), color = AmberBg, modifier = Modifier.fillMaxWidth().padding(20.dp, 20.dp, 20.dp, 0.dp)) {
                Text(
                    "Tu respuesta anterior fue: $respuestaAnterior ✗",
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                    color = TextoPrimario,
                    style = MaterialTheme.typography.bodySmall,
                )
            }

            when (val s = estado) {
                is UiState.Cargando -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                    CircularProgressIndicator(color = Teal)
                }

                is UiState.Error -> Box(Modifier.fillMaxSize().padding(24.dp), Alignment.Center) {
                    Text(s.mensaje, color = TextoSecundario, textAlign = TextAlign.Center)
                }

                is UiState.Exito -> EjercicioContent(
                    ejercicio = s.datos,
                    resultado = resultado,
                    onResponder = { respuesta, tiempoSegundos -> viewModel.responder(respuesta, tiempoSegundos) },
                    onSiguiente = onExito,
                )
            }
        }
    }
}

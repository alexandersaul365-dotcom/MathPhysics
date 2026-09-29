package com.mathphysics.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Warning
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
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mathphysics.app.data.model.Racha
import com.mathphysics.app.ui.components.BottomNavBar
import com.mathphysics.app.ui.components.OnResumeEffect
import com.mathphysics.app.ui.components.SeccionNav
import com.mathphysics.app.ui.theme.*
import com.mathphysics.app.ui.viewmodel.RachaViewModel
import com.mathphysics.app.ui.viewmodel.UiState

@Composable
fun RachaScreen(
    onBack: () -> Unit,
    onPracticarAhora: () -> Unit,
    viewModel: RachaViewModel = viewModel(),
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
                        Text("Mi Racha", style = MaterialTheme.typography.headlineSmall, color = Color.White)
                        Text("Práctica diaria", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.8f))
                    }
                }
            }
        },
        bottomBar = { BottomNavBar(SeccionNav.INICIO) },
    ) { padding ->
        when (val s = estado) {
            is UiState.Cargando -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                CircularProgressIndicator(color = Teal)
            }

            is UiState.Error -> Box(Modifier.fillMaxSize().padding(padding).padding(24.dp), Alignment.Center) {
                Text(s.mensaje, color = TextoSecundario, textAlign = TextAlign.Center)
            }

            is UiState.Exito -> RachaContenido(racha = s.datos, onPracticarAhora = onPracticarAhora, padding = padding)
        }
    }
}

@Composable
private fun RachaContenido(racha: Racha, onPracticarAhora: () -> Unit, padding: PaddingValues) {
    Column(modifier = Modifier.padding(padding).padding(20.dp)) {
        if (racha.enRiesgo) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = AmberBg,
                border = BorderStroke(1.dp, Amber.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = Amber, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Tu racha está en riesgo", fontWeight = FontWeight.Bold, color = TextoPrimario)
                    }
                    Spacer(Modifier.height(4.dp))
                    Text("No has practicado hoy. ¡Tienes hasta las 23:59!", style = MaterialTheme.typography.bodySmall, color = TextoSecundario)
                }
            }
            Spacer(Modifier.height(14.dp))
        }

        Surface(
            shape = RoundedCornerShape(14.dp),
            color = AmberBg,
            border = BorderStroke(1.dp, Amber.copy(alpha = 0.35f)),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("🔥", fontSize = 36.sp)
                Text("${racha.dias}", fontSize = 40.sp, fontWeight = FontWeight.Bold, color = Amber)
                Text("días · ¡No pierdas tu racha!", style = MaterialTheme.typography.bodySmall, color = TextoSecundario)
            }
        }

        if (racha.enRiesgo) {
            Spacer(Modifier.height(14.dp))
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color.White,
                border = BorderStroke(1.dp, ErrorRed.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Tiempo restante hoy", style = MaterialTheme.typography.bodySmall, color = ErrorRed)
                    Text(racha.tiempoRestante, fontSize = 26.sp, fontWeight = FontWeight.Bold, color = ErrorRed)
                }
            }

            Spacer(Modifier.height(16.dp))
            Button(
                onClick = onPracticarAhora,
                colors = ButtonDefaults.buttonColors(containerColor = Teal),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth().height(52.dp),
            ) {
                Text("Practicar ahora", color = Color.White, fontWeight = FontWeight.Bold)
            }
        }
    }
}

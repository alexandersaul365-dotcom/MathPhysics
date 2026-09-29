package com.mathphysics.app.ui.screens

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mathphysics.app.data.model.Recompensas
import com.mathphysics.app.ui.components.BottomNavBar
import com.mathphysics.app.ui.components.OnResumeEffect
import com.mathphysics.app.ui.components.SeccionNav
import com.mathphysics.app.ui.theme.*
import com.mathphysics.app.ui.viewmodel.RecompensasViewModel
import com.mathphysics.app.ui.viewmodel.UiState

@Composable
fun RecompensasScreen(
    onBack: () -> Unit,
    viewModel: RecompensasViewModel = viewModel(),
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
                        Text("Mis Recompensas", style = MaterialTheme.typography.headlineSmall, color = Color.White)
                        Text("Experiencia y nivel actual", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.8f))
                    }
                }
            }
        },
        bottomBar = { BottomNavBar(SeccionNav.LOGROS) },
    ) { padding ->
        when (val s = estado) {
            is UiState.Cargando -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                CircularProgressIndicator(color = Teal)
            }

            is UiState.Error -> Box(Modifier.fillMaxSize().padding(padding).padding(24.dp), Alignment.Center) {
                Text(s.mensaje, color = TextoSecundario, textAlign = TextAlign.Center)
            }

            is UiState.Exito -> RecompensasContenido(s.datos, padding)
        }
    }
}

@Composable
private fun RecompensasContenido(datos: Recompensas, padding: PaddingValues) {
    Column(modifier = Modifier.padding(padding).padding(20.dp)) {
        Surface(
            shape = RoundedCornerShape(14.dp),
            color = AmberBg,
            border = BorderStroke(1.dp, Amber.copy(alpha = 0.35f)),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("${datos.xpTotal} XP", fontSize = 30.sp, fontWeight = FontWeight.Bold, color = Amber)
                Text("Nivel ${datos.nivel} – ${datos.nombreNivel}", style = MaterialTheme.typography.bodySmall, color = TextoSecundario)
            }
        }

        Spacer(Modifier.height(16.dp))

        Text("Progreso al Nivel ${datos.nivel + 1}", style = MaterialTheme.typography.bodySmall, color = TextoSecundario)
        Spacer(Modifier.height(4.dp))
        Box(Modifier.fillMaxWidth().height(6.dp).background(Borde, RoundedCornerShape(3.dp))) {
            Box(Modifier.fillMaxHeight().fillMaxWidth(datos.progresoNivel.coerceIn(0f, 1f)).background(Amber, RoundedCornerShape(3.dp)))
        }
        Spacer(Modifier.height(4.dp))
        Text("${datos.xpRestante} XP restantes", style = MaterialTheme.typography.bodySmall, color = TextoSecundario)

        if (datos.bonificaciones.isNotEmpty()) {
            Spacer(Modifier.height(20.dp))
            Text("Bonificaciones activas", style = MaterialTheme.typography.titleMedium, color = TextoPrimario)
            Spacer(Modifier.height(10.dp))
            datos.bonificaciones.forEach { bono ->
                Surface(shape = RoundedCornerShape(10.dp), color = AmberBg, modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                    Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(bono.nombre, color = TextoPrimario)
                        Text(bono.valor, color = Amber, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Spacer(Modifier.height(20.dp))
        Text("Últimos XP obtenidos", style = MaterialTheme.typography.titleMedium, color = TextoPrimario)
        Spacer(Modifier.height(10.dp))

        if (datos.historial.isEmpty()) {
            Text("Todavía no has ganado XP", color = TextoSecundario, style = MaterialTheme.typography.bodySmall)
        }

        datos.historial.forEach { item ->
            Row(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(item.concepto, color = TextoPrimario, style = MaterialTheme.typography.bodyMedium)
                Text(item.cantidad, color = Teal, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

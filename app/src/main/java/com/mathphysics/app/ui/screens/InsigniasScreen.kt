package com.mathphysics.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronRight
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
import com.mathphysics.app.data.model.Insignia
import com.mathphysics.app.ui.components.BottomNavBar
import com.mathphysics.app.ui.components.OnResumeEffect
import com.mathphysics.app.ui.components.SeccionNav
import com.mathphysics.app.ui.theme.*
import com.mathphysics.app.ui.viewmodel.InsigniasViewModel
import com.mathphysics.app.ui.viewmodel.UiState

@Composable
fun InsigniasScreen(
    onBack: () -> Unit,
    onVerRecompensas: () -> Unit,
    viewModel: InsigniasViewModel = viewModel(),
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
                        Text("Mis Insignias", style = MaterialTheme.typography.headlineSmall, color = Color.White)
                        Text("Logros obtenidos", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.8f))
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

            is UiState.Exito -> InsigniasContenido(s.datos, onVerRecompensas, padding)
        }
    }
}

@Composable
private fun InsigniasContenido(insignias: List<Insignia>, onVerRecompensas: () -> Unit, padding: PaddingValues) {
    val desbloqueadas = insignias.count { it.desbloqueada }

    Column(modifier = Modifier.padding(padding).padding(20.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().clickable { onVerRecompensas() },
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("$desbloqueadas de ${insignias.size} insignias desbloqueadas", style = MaterialTheme.typography.bodySmall, color = TextoSecundario)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Ver mi XP", color = Teal, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Teal, modifier = Modifier.size(16.dp))
            }
        }

        Spacer(Modifier.height(12.dp))

        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(insignias) { insignia -> InsigniaCard(insignia) }
        }
    }
}

@Composable
private fun InsigniaCard(insignia: Insignia) {
    Surface(shape = RoundedCornerShape(14.dp), color = if (insignia.desbloqueada) AmberBg else SuperficieNeutra) {
        Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
            Text(insignia.icono, fontSize = 26.sp)
            Spacer(Modifier.height(6.dp))
            Text(insignia.nombre, fontWeight = FontWeight.Bold, color = if (insignia.desbloqueada) TextoPrimario else TextoSecundario, style = MaterialTheme.typography.bodyMedium)
            Text(insignia.descripcion, color = TextoSecundario, style = MaterialTheme.typography.bodySmall)
        }
    }
}

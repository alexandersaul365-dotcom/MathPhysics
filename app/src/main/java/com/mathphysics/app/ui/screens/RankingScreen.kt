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
import com.mathphysics.app.data.model.RankingEntry
import com.mathphysics.app.ui.components.BottomNavBar
import com.mathphysics.app.ui.components.OnResumeEffect
import com.mathphysics.app.ui.components.SeccionNav
import com.mathphysics.app.ui.theme.*
import com.mathphysics.app.ui.viewmodel.RankingViewModel
import com.mathphysics.app.ui.viewmodel.UiState

private val MEDALLAS = mapOf(1 to "🥇", 2 to "🥈", 3 to "🥉")

@Composable
fun RankingScreen(
    onBack: () -> Unit,
    viewModel: RankingViewModel = viewModel(),
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
                        Text("Ranking", style = MaterialTheme.typography.headlineSmall, color = Color.White)
                        Text("Top jugadores por XP", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.8f))
                    }
                }
            }
        },
        bottomBar = { BottomNavBar(SeccionNav.RANKING) },
    ) { padding ->
        when (val s = estado) {
            is UiState.Cargando -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                CircularProgressIndicator(color = Teal)
            }

            is UiState.Error -> Box(Modifier.fillMaxSize().padding(padding).padding(24.dp), Alignment.Center) {
                Text(s.mensaje, color = TextoSecundario, textAlign = TextAlign.Center)
            }

            is UiState.Exito -> RankingContenido(s.datos, padding)
        }
    }
}

@Composable
private fun RankingContenido(ranking: List<RankingEntry>, padding: PaddingValues) {
    Column(modifier = Modifier.padding(padding).padding(20.dp)) {
        Text("Clasificación por puntos de experiencia", style = MaterialTheme.typography.bodySmall, color = TextoSecundario)
        Spacer(Modifier.height(12.dp))

        if (ranking.isEmpty()) {
            Text("Todavía no hay nadie en el ranking", color = TextoSecundario)
            return
        }

        val top = ranking.filter { !it.esUsuarioActual }

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.weight(1f)) {
            items(top) { entry -> RankingRow(entry) }
        }

        ranking.firstOrNull { it.esUsuarioActual }?.let { yo ->
            Spacer(Modifier.height(12.dp))
            RankingRow(yo, destacado = true)
        }
    }
}

@Composable
private fun RankingRow(entry: RankingEntry, destacado: Boolean = false) {
    val esTop3 = entry.posicion <= 3 && !destacado
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = when {
            destacado -> Superficie
            esTop3 -> AmberBg
            else -> TealLight
        },
        border = if (destacado) BorderStroke(2.dp, Teal) else null,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(MEDALLAS[entry.posicion] ?: "${entry.posicion}", modifier = Modifier.width(32.dp), style = MaterialTheme.typography.bodyMedium, color = TextoSecundario)
            Text(
                if (destacado) "${entry.nombre} (tú)" else entry.nombre,
                color = TextoPrimario,
                fontWeight = if (destacado) FontWeight.Bold else FontWeight.Normal,
                modifier = Modifier.weight(1f),
            )
            Text("${entry.xp} XP", color = if (esTop3) Amber else Teal, fontWeight = FontWeight.Bold)
        }
    }
}

package com.mathphysics.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mathphysics.app.data.model.SubtemaConEjercicios
import com.mathphysics.app.ui.components.BottomNavBar
import com.mathphysics.app.ui.components.OnResumeEffect
import com.mathphysics.app.ui.components.SeccionNav
import com.mathphysics.app.ui.theme.*
import com.mathphysics.app.ui.viewmodel.EjerciciosDisponiblesViewModel
import com.mathphysics.app.ui.viewmodel.UiState

@Composable
fun EjerciciosDisponiblesScreen(
    onSubtemaClick: (SubtemaConEjercicios) -> Unit,
    viewModel: EjerciciosDisponiblesViewModel = viewModel(),
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
                    .padding(top = 44.dp, start = 24.dp, end = 24.dp, bottom = 20.dp)
            ) {
                Text("Ejercicios", style = MaterialTheme.typography.headlineSmall, color = Color.White)
                Text(
                    "Elige un tema para practicar",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.8f),
                )
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
                if (s.datos.isEmpty()) {
                    Box(Modifier.fillMaxSize().padding(padding).padding(24.dp), Alignment.Center) {
                        Text("Todavía no hay ejercicios de práctica disponibles", color = TextoSecundario, textAlign = TextAlign.Center)
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.padding(padding),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        items(s.datos) { subtema ->
                            SubtemaCard(subtema, onClick = { onSubtemaClick(subtema) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SubtemaCard(subtema: SubtemaConEjercicios, onClick: () -> Unit) {
    val esFisica = subtema.materia == "fisica"
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Fondo,
        border = BorderStroke(1.dp, Borde),
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = if (esFisica) AmberBg else TealLight,
                modifier = Modifier.size(40.dp),
            ) {
                Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Text(if (esFisica) "⚡" else "Σ", color = if (esFisica) Amber else Teal, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(subtema.subtemaNombre, style = MaterialTheme.typography.titleMedium, color = TextoPrimario)
                Text(subtema.temaNombre, style = MaterialTheme.typography.bodySmall, color = TextoSecundario)
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Teal)
        }
    }
}

package com.mathphysics.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mathphysics.app.data.model.Tema
import com.mathphysics.app.ui.components.BottomNavBar
import com.mathphysics.app.ui.components.OnResumeEffect
import com.mathphysics.app.ui.components.SeccionNav
import com.mathphysics.app.ui.theme.*
import com.mathphysics.app.ui.viewmodel.ParametrizedViewModelFactory
import com.mathphysics.app.ui.viewmodel.TemasViewModel
import com.mathphysics.app.ui.viewmodel.UiState

@Composable
fun TemasModuloScreen(
    materiaId: String,
    materiaNombre: String,
    onTemaClick: (Tema) -> Unit,
    onBack: () -> Unit,
) {
    val viewModel: TemasViewModel = viewModel(
        factory = ParametrizedViewModelFactory { TemasViewModel(materiaId) },
    )
    val estado by viewModel.estado.collectAsState()
    OnResumeEffect { viewModel.cargarTemas() }

    Scaffold(
        containerColor = Fondo,
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Teal)
                    .padding(top = 44.dp, bottom = 20.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 12.dp)) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Volver", tint = Color.White)
                    }
                    Column {
                        Text(materiaNombre, style = MaterialTheme.typography.headlineSmall, color = Color.White)
                        Text("Selecciona un tema", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.8f))
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

            is UiState.Error -> Box(
                Modifier.fillMaxSize().padding(padding).padding(24.dp),
                Alignment.Center,
            ) {
                Text(s.mensaje, color = ErrorRed, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            }

            is UiState.Exito -> LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(s.datos) { tema ->
                    TemaRow(tema = tema, onClick = { onTemaClick(tema) })
                }
            }
        }
    }
}

@Composable
private fun TemaRow(tema: Tema, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Fondo,
        border = BorderStroke(1.dp, Borde),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    tema.nombre,
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextoPrimario,
                )
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(4.dp)
                            .background(Borde, RoundedCornerShape(2.dp)),
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .fillMaxWidth(tema.progreso / 100f)
                                .background(Teal, RoundedCornerShape(2.dp)),
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "${tema.progreso}%",
                        style = MaterialTheme.typography.bodySmall,
                        color = Teal,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            Spacer(Modifier.width(12.dp))
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Teal)
        }
    }
}

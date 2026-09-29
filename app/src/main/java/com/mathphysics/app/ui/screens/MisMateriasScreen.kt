package com.mathphysics.app.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mathphysics.app.R
import com.mathphysics.app.data.model.Materia
import com.mathphysics.app.ui.components.BottomNavBar
import com.mathphysics.app.ui.components.OnResumeEffect
import com.mathphysics.app.ui.components.SeccionNav
import com.mathphysics.app.ui.theme.*
import com.mathphysics.app.ui.viewmodel.MisMateriasViewModel
import com.mathphysics.app.ui.viewmodel.UiState

@Composable
fun MisMateriasScreen(
    onMateriaClick: (Materia) -> Unit,
    onVerRacha: () -> Unit = {},
    viewModel: MisMateriasViewModel = viewModel(),
) {
    val estado by viewModel.estado.collectAsState()
    OnResumeEffect { viewModel.cargarMaterias() }

    Scaffold(
        containerColor = Superficie,
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 52.dp, start = 24.dp, end = 24.dp, bottom = 20.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text(
                        "Mis Materias",
                        style = MaterialTheme.typography.headlineSmall,
                        color = TextoPrimario,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        "Selecciona una materia para comenzar",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextoSecundario,
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { AppTheme.modoOscuro = !AppTheme.modoOscuro }) {
                        Icon(
                            if (AppTheme.modoOscuro) Icons.Default.LightMode else Icons.Default.DarkMode,
                            contentDescription = if (AppTheme.modoOscuro) "Cambiar a modo claro" else "Cambiar a modo oscuro",
                            tint = TextoSecundario,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                    IconButton(onClick = onVerRacha) {
                        Icon(Icons.Default.LocalFireDepartment, contentDescription = "Racha", tint = Amber, modifier = Modifier.size(20.dp))
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
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp),
            ) {
                items(s.datos) { materia ->
                    MateriaCard(materia = materia, onClick = { onMateriaClick(materia) })
                }
            }
        }
    }
}

@Composable
private fun MateriaCard(materia: Materia, onClick: () -> Unit) {
    val imagen = if (materia.id == "fisica") R.drawable.mascota_fisica else R.drawable.mascota_matematicas
    val nombreMostrado = if (materia.id == "fisica") "Física" else "Matemáticas"

    Column(modifier = Modifier.fillMaxWidth().clickable { onClick() }) {
        Image(
            painter = painterResource(id = imagen),
            contentDescription = materia.nombre,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxWidth()
                .height(180.dp)
                .clip(RoundedCornerShape(18.dp)),
        )

        Spacer(Modifier.height(12.dp))

        Text(nombreMostrado, style = MaterialTheme.typography.titleMedium, color = TextoPrimario, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(2.dp))
        Text(
            "${materia.temasCount} temas · ${materia.subtemasCount} subtemas",
            style = MaterialTheme.typography.bodySmall,
            color = TextoSecundario,
        )

        Spacer(Modifier.height(10.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(3.dp)
                    .background(Borde, RoundedCornerShape(2.dp)),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(materia.progreso / 100f)
                        .background(Teal, RoundedCornerShape(2.dp)),
                )
            }
            Spacer(Modifier.width(10.dp))
            Text(
                "${materia.progreso}%",
                color = TextoSecundario,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium,
            )
        }
    }
}

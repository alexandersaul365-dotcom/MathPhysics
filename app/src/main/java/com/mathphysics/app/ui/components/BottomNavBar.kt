package com.mathphysics.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Create
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.mathphysics.app.navigation.LocalNavController
import com.mathphysics.app.ui.theme.Borde
import com.mathphysics.app.ui.theme.Teal
import com.mathphysics.app.ui.theme.TextoSecundario

enum class SeccionNav(val etiqueta: String, val icono: ImageVector, val ruta: String) {
    INICIO("Inicio", Icons.Default.Home, "materias"),
    EJERCICIOS("Ejer.", Icons.Default.Create, "ejercicios_disponibles"),
    REPASO("Repaso", Icons.Default.Refresh, "repaso"),
    LOGROS("Logros", Icons.Default.Star, "insignias"),
    RANKING("Ranking", Icons.Default.List, "ranking"),
}

@Composable
fun BottomNavBar(seccionActiva: SeccionNav = SeccionNav.INICIO) {
    val navController = LocalNavController.current

    Surface(
        color = Color.White,
        border = BorderStroke(1.dp, Borde),
        // Empuja la barra por encima de la barra de gestos/botones del sistema,
        // para que no se encimen (edge-to-edge estaba dibujando debajo de ella).
        modifier = Modifier.windowInsetsPadding(WindowInsets.navigationBars),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            SeccionNav.values().forEach { seccion ->
                val activa = seccion == seccionActiva
                val color = if (activa) Teal else TextoSecundario
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.clickable(enabled = !activa) {
                        navController?.navigate(seccion.ruta) {
                            popUpTo(navController.graph.startDestinationId) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                ) {
                    Icon(seccion.icono, contentDescription = seccion.etiqueta, tint = color, modifier = Modifier.size(20.dp))
                    Text(seccion.etiqueta, color = color, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

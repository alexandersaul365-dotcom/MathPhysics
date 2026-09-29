package com.mathphysics.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

@Composable
fun MathPhysicsTheme(content: @Composable () -> Unit) {
    val colorScheme = if (AppTheme.modoOscuro) {
        darkColorScheme(
            primary = Teal,
            onPrimary = Color.White,
            secondary = Amber,
            onSecondary = TextoPrimario,
            background = Fondo,
            onBackground = TextoPrimario,
            surface = Superficie,
            onSurface = TextoPrimario,
            error = ErrorRed,
            onError = Color.White,
        )
    } else {
        lightColorScheme(
            primary = Teal,
            onPrimary = Color.White,
            secondary = Amber,
            onSecondary = TextoPrimario,
            background = Fondo,
            onBackground = TextoPrimario,
            surface = Superficie,
            onSurface = TextoPrimario,
            error = ErrorRed,
            onError = Color.White,
        )
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = MathPhysicsTypography,
        content = content,
    )
}

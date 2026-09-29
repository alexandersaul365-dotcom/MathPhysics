package com.mathphysics.app.ui.theme

import androidx.compose.ui.graphics.Color

// Misma paleta aplicada a los maquetados de Figma (coincide con el logo),
// con su versión para modo oscuro. Cada token es una propiedad calculada
// (get() = ...) que lee AppTheme.modoOscuro — al ser un "val ... get()"
// leído dentro de un Composable, Compose recompone automáticamente cuando
// el modo cambia, sin que cada pantalla tenga que saber nada de esto.

val Teal: Color get() = if (AppTheme.modoOscuro) Color(0xFF2DC4CC) else Color(0xFF14A8B0)
val TealDark: Color get() = if (AppTheme.modoOscuro) Color(0xFF0C7680) else Color(0xFF0C7680)
val TealLight: Color get() = if (AppTheme.modoOscuro) Color(0xFF123339) else Color(0xFFDEF6F8)

val Amber: Color get() = if (AppTheme.modoOscuro) Color(0xFFF3B940) else Color(0xFFF3B940)
val AmberBg: Color get() = if (AppTheme.modoOscuro) Color(0xFF3A2E14) else Color(0xFFFAEEDA)

val ErrorRed: Color get() = if (AppTheme.modoOscuro) Color(0xFFFF6B6A) else Color(0xFFE24B4A)

val Fondo: Color get() = if (AppTheme.modoOscuro) Color(0xFF14161C) else Color(0xFFF5FAF7)
val Superficie: Color get() = if (AppTheme.modoOscuro) Color(0xFF20222C) else Color.White
val SuperficieNeutra: Color get() = if (AppTheme.modoOscuro) Color(0xFF2A2C36) else Color(0xFFF0F0EC)
val ErrorBg: Color get() = if (AppTheme.modoOscuro) Color(0xFF3A1F1F) else Color(0xFFFBE4E4)

val TextoPrimario: Color get() = if (AppTheme.modoOscuro) Color(0xFFECEDF0) else Color(0xFF1B1C2C)
val TextoSecundario: Color get() = if (AppTheme.modoOscuro) Color(0xFFA0A3B0) else Color(0xFF7C7E8C)
val Borde: Color get() = if (AppTheme.modoOscuro) Color(0xFF383A44) else Color(0xFFD3D1C9)

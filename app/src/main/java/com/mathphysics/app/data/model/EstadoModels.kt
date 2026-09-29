package com.mathphysics.app.data.model

data class Racha(
    val dias: Int,
    val enRiesgo: Boolean,
    val tiempoRestante: String = "",
)

data class Bonificacion(val nombre: String, val valor: String)
data class HistorialXp(val concepto: String, val cantidad: String)

data class Recompensas(
    val xpTotal: Int,
    val nivel: Int,
    val nombreNivel: String,
    val xpRestante: Int,
    val progresoNivel: Float,
    val bonificaciones: List<Bonificacion>,
    val historial: List<HistorialXp>,
)

data class Insignia(
    val icono: String,
    val nombre: String,
    val descripcion: String,
    val desbloqueada: Boolean,
)

data class RankingEntry(
    val posicion: Int,
    val nombre: String,
    val xp: Int,
    val esUsuarioActual: Boolean = false,
)

data class ErrorPendiente(
    val id: Int,
    val ejercicioId: Int,
    val tema: String,
    val enunciado: String,
    val respuestaResumen: String,
)

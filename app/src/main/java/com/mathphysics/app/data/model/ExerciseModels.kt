package com.mathphysics.app.data.model

import com.google.gson.annotations.SerializedName

data class OpcionEjercicio(val id: Int, val texto: String)
data class PasoEjercicio(val id: Int, val descripcion: String)

data class SubtemaConEjercicios(
    val subtemaId: Int,
    val subtemaNombre: String,
    val temaNombre: String,
    val materia: String,
)

data class RangoSimulacion(
    val min: Double,
    val max: Double,
    val paso: Double = 1.0,
)

data class ValoresInicialesSimulacion(
    val fijos: Map<String, Any>? = null,
    val incognita: String? = null,
    val objetivo: Map<String, Double>? = null,
    val opciones: List<Double>? = null,
    val rango: RangoSimulacion? = null,
)

data class Ejercicio(
    val id: Int,
    val tipo: String, // "opcion_multiple" | "numerico" | "variable" | "simulacion" | "paso_a_paso"
    val enunciado: String,
    val xp: Int,
    val opciones: List<OpcionEjercicio>? = null,
    val unidad: String? = null,
    val tipoSimulacion: String? = null,
    val valoresIniciales: ValoresInicialesSimulacion? = null,
    val ecuacion: String? = null,
    val pasos: List<PasoEjercicio>? = null,
)

data class RespuestaRequest(
    @SerializedName("usuario_id") val usuarioId: Int,
    val respuesta: Map<String, @JvmSuppressWildcards Any>,
    @SerializedName("tiempo_segundos") val tiempoSegundos: Int? = null,
)

data class RespuestaResultado(
    val correcta: Boolean,
    @SerializedName("xp_otorgado") val xpOtorgado: Int,
    @SerializedName("bono_velocidad") val bonoVelocidad: Double = 1.0,
    @SerializedName("racha_dias") val rachaDias: Int,
    @SerializedName("respuesta_correcta") val respuestaCorrecta: Map<String, @JvmSuppressWildcards Any>? = null,
    @SerializedName("insignias_desbloqueadas") val insigniasDesbloqueadas: List<String> = emptyList(),
)

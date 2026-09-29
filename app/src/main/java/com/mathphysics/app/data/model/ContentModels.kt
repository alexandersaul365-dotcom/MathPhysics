package com.mathphysics.app.data.model

import com.google.gson.annotations.SerializedName

data class Materia(
    val id: String,       // "matematicas" | "fisica"
    val nombre: String,   // "Matemáticas" | "Física"
    val temasCount: Int,
    val subtemasCount: Int,
    val progreso: Int,    // 0-100
)

data class Tema(
    val id: Int,
    val nombre: String,
    val progreso: Int = 0,
)

data class Subtema(
    val id: Int,
    val nombre: String,
    val progreso: Int = 0,
)

data class PasoEjemplo(
    val texto: String,
    val esFinal: Boolean = false,
)

data class Seccion(
    val explicacion: String,
    val pasos: List<PasoEjemplo>,
)

data class Leccion(
    val titulo: String,
    val breadcrumb: String,
    val definicion: String?,
    val formula: String?,
    val secciones: List<Seccion>,
    val subtemaId: Int,
)

data class OpcionPreguntaTeorica(
    val id: Int,
    val texto: String,
)

data class PreguntaTeorica(
    val id: Int,
    val titulo: String,
    val cuerpo: String,
    val formula: String?,
    val opciones: List<OpcionPreguntaTeorica>,
)

data class RespuestaPreguntaTeoricaRequest(
    @SerializedName("usuario_id") val usuarioId: Int,
    @SerializedName("opcion_id") val opcionId: Int,
)

data class RespuestaPreguntaTeoricaResultado(
    val correcta: Boolean,
    @SerializedName("xp_otorgado") val xpOtorgado: Int,
    @SerializedName("opcion_correcta_id") val opcionCorrectaId: Int?,
    @SerializedName("ya_dominada") val yaDominada: Boolean = false,
)

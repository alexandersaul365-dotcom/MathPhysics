package com.mathphysics.app.data.repository

import com.mathphysics.app.data.model.Ejercicio
import com.mathphysics.app.data.model.Leccion
import com.mathphysics.app.data.model.Materia
import com.mathphysics.app.data.model.PreguntaTeorica
import com.mathphysics.app.data.model.RespuestaPreguntaTeoricaRequest
import com.mathphysics.app.data.model.RespuestaPreguntaTeoricaResultado
import com.mathphysics.app.data.model.RespuestaRequest
import com.mathphysics.app.data.model.RespuestaResultado
import com.mathphysics.app.data.model.Subtema
import com.mathphysics.app.data.model.SubtemaConEjercicios
import com.mathphysics.app.data.model.Tema
import com.mathphysics.app.data.local.SessionManager
import com.mathphysics.app.data.remote.ApiService
import com.mathphysics.app.data.remote.RetrofitClient

class ContenidoRepository(
    private val api: ApiService = RetrofitClient.apiService,
) {
    suspend fun obtenerMaterias(): List<Materia> = api.listarMaterias(SessionManager.usuarioId)

    suspend fun obtenerTemas(materiaId: String): List<Tema> = api.listarTemas(materiaId, SessionManager.usuarioId)

    suspend fun obtenerSubtemas(temaId: Int): List<Subtema> = api.listarSubtemas(temaId, SessionManager.usuarioId)

    suspend fun obtenerLeccion(subtemaId: Int): Leccion = api.obtenerLeccion(subtemaId)

    suspend fun obtenerPreguntasTeoricas(subtemaId: Int): List<PreguntaTeorica> = api.listarPreguntasTeoricas(subtemaId)

    suspend fun responderPreguntaTeorica(preguntaId: Int, opcionId: Int): RespuestaPreguntaTeoricaResultado =
        api.responderPreguntaTeorica(preguntaId, RespuestaPreguntaTeoricaRequest(SessionManager.usuarioId, opcionId))

    suspend fun listarSubtemasConEjercicios(): List<SubtemaConEjercicios> = api.listarSubtemasConEjercicios()

    suspend fun listarEjercicios(subtemaId: Int): List<Ejercicio> = api.listarEjercicios(subtemaId)

    suspend fun obtenerEjercicio(ejercicioId: Int): Ejercicio = api.obtenerEjercicio(ejercicioId)

    suspend fun responder(ejercicioId: Int, respuesta: Map<String, Any>, tiempoSegundos: Int? = null): RespuestaResultado =
        api.responderEjercicio(ejercicioId, RespuestaRequest(SessionManager.usuarioId, respuesta, tiempoSegundos))
}

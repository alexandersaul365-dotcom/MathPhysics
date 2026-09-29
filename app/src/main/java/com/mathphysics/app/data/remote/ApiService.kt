package com.mathphysics.app.data.remote

import com.mathphysics.app.data.model.Ejercicio
import com.mathphysics.app.data.model.ErrorPendiente
import com.mathphysics.app.data.model.Insignia
import com.mathphysics.app.data.model.Leccion
import com.mathphysics.app.data.model.LoginRequest
import com.mathphysics.app.data.model.Materia
import com.mathphysics.app.data.model.MensajeResultado
import com.mathphysics.app.data.model.PreguntaTeorica
import com.mathphysics.app.data.model.Racha
import com.mathphysics.app.data.model.RankingEntry
import com.mathphysics.app.data.model.Recompensas
import com.mathphysics.app.data.model.RegistroRequest
import com.mathphysics.app.data.model.RespuestaPreguntaTeoricaRequest
import com.mathphysics.app.data.model.RespuestaPreguntaTeoricaResultado
import com.mathphysics.app.data.model.RespuestaRequest
import com.mathphysics.app.data.model.RespuestaResultado
import com.mathphysics.app.data.model.SesionResultado
import com.mathphysics.app.data.model.Subtema
import com.mathphysics.app.data.model.SubtemaConEjercicios
import com.mathphysics.app.data.model.Tema
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {

    // --- Autenticación (RQF1-4) ---
    @POST("api/auth/registro")
    suspend fun registrar(@Body body: RegistroRequest): SesionResultado

    @POST("api/auth/login")
    suspend fun iniciarSesion(@Body body: LoginRequest): SesionResultado

    // El token va en el header Authorization, agregado automáticamente por
    // el interceptor de RetrofitClient — no necesita parámetros.
    @POST("api/auth/logout")
    suspend fun cerrarSesion(): MensajeResultado

    // --- Contenido educativo ---
    @GET("api/contenido/materias")
    suspend fun listarMaterias(@Query("usuario_id") usuarioId: Int): List<Materia>

    @GET("api/contenido/temas")
    suspend fun listarTemas(@Query("materia") materia: String, @Query("usuario_id") usuarioId: Int): List<Tema>

    @GET("api/contenido/temas/{temaId}/subtemas")
    suspend fun listarSubtemas(@Path("temaId") temaId: Int, @Query("usuario_id") usuarioId: Int): List<Subtema>

    @GET("api/contenido/subtemas/{subtemaId}/leccion")
    suspend fun obtenerLeccion(@Path("subtemaId") subtemaId: Int): Leccion

    // --- Preguntas teóricas (RQF26) ---
    @GET("api/preguntas-teoricas/subtema/{subtemaId}")
    suspend fun listarPreguntasTeoricas(@Path("subtemaId") subtemaId: Int): List<PreguntaTeorica>

    @POST("api/preguntas-teoricas/{preguntaId}/responder")
    suspend fun responderPreguntaTeorica(
        @Path("preguntaId") preguntaId: Int,
        @Body body: RespuestaPreguntaTeoricaRequest,
    ): RespuestaPreguntaTeoricaResultado

    // --- Ejercicios ---
    @GET("api/ejercicios/disponibles")
    suspend fun listarSubtemasConEjercicios(): List<SubtemaConEjercicios>

    @GET("api/ejercicios/subtema/{subtemaId}")
    suspend fun listarEjercicios(@Path("subtemaId") subtemaId: Int): List<Ejercicio>

    @GET("api/ejercicios/{ejercicioId}")
    suspend fun obtenerEjercicio(@Path("ejercicioId") ejercicioId: Int): Ejercicio

    @POST("api/ejercicios/{ejercicioId}/responder")
    suspend fun responderEjercicio(
        @Path("ejercicioId") ejercicioId: Int,
        @Body body: RespuestaRequest,
    ): RespuestaResultado

    // --- Progreso ---
    @GET("api/racha/{usuarioId}")
    suspend fun obtenerRacha(@Path("usuarioId") usuarioId: Int): Racha

    @GET("api/recompensas/{usuarioId}")
    suspend fun obtenerRecompensas(@Path("usuarioId") usuarioId: Int): Recompensas

    @GET("api/insignias/{usuarioId}")
    suspend fun obtenerInsignias(@Path("usuarioId") usuarioId: Int): List<Insignia>

    @GET("api/repaso/{usuarioId}")
    suspend fun obtenerRepaso(@Path("usuarioId") usuarioId: Int): List<ErrorPendiente>

    @GET("api/ranking")
    suspend fun obtenerRanking(@Query("usuario_id") usuarioId: Int): List<RankingEntry>
}

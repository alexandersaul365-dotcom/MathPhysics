package com.mathphysics.app.data.repository

import com.mathphysics.app.data.model.ErrorPendiente
import com.mathphysics.app.data.model.Insignia
import com.mathphysics.app.data.model.Racha
import com.mathphysics.app.data.model.RankingEntry
import com.mathphysics.app.data.model.Recompensas
import com.mathphysics.app.data.remote.ApiService
import com.mathphysics.app.data.remote.Config
import com.mathphysics.app.data.remote.RetrofitClient

class ProgresoRepository(
    private val api: ApiService = RetrofitClient.apiService,
) {
    suspend fun obtenerRacha(): Racha = api.obtenerRacha(Config.USUARIO_PRUEBA_ID)

    suspend fun obtenerRecompensas(): Recompensas = api.obtenerRecompensas(Config.USUARIO_PRUEBA_ID)

    suspend fun obtenerInsignias(): List<Insignia> = api.obtenerInsignias(Config.USUARIO_PRUEBA_ID)

    suspend fun obtenerRepaso(): List<ErrorPendiente> = api.obtenerRepaso(Config.USUARIO_PRUEBA_ID)

    // Marca localmente cuál fila del ranking es el usuario de prueba (el
    // backend no lo distingue, solo regresa el top general).
    suspend fun obtenerRanking(): List<RankingEntry> =
        api.obtenerRanking().map { it.copy(esUsuarioActual = it.nombre == Config.USUARIO_PRUEBA_NOMBRE) }
}

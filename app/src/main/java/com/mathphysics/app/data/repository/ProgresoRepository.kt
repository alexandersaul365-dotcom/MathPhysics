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

    // El backend ya marca cuál fila es el usuario actual (es_usuario_actual)
    // y agrega su posición exacta al final si no está en el top 10.
    suspend fun obtenerRanking(): List<RankingEntry> = api.obtenerRanking(Config.USUARIO_PRUEBA_ID)
}

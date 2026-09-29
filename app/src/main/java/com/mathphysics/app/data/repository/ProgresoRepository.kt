package com.mathphysics.app.data.repository

import com.mathphysics.app.data.local.SessionManager
import com.mathphysics.app.data.model.ErrorPendiente
import com.mathphysics.app.data.model.Insignia
import com.mathphysics.app.data.model.Racha
import com.mathphysics.app.data.model.RankingEntry
import com.mathphysics.app.data.model.Recompensas
import com.mathphysics.app.data.remote.ApiService
import com.mathphysics.app.data.remote.RetrofitClient

class ProgresoRepository(
    private val api: ApiService = RetrofitClient.apiService,
) {
    suspend fun obtenerRacha(): Racha = api.obtenerRacha(SessionManager.usuarioId)

    suspend fun obtenerRecompensas(): Recompensas = api.obtenerRecompensas(SessionManager.usuarioId)

    suspend fun obtenerInsignias(): List<Insignia> = api.obtenerInsignias(SessionManager.usuarioId)

    suspend fun obtenerRepaso(): List<ErrorPendiente> = api.obtenerRepaso(SessionManager.usuarioId)

    // El backend ya marca cuál fila es el usuario actual (es_usuario_actual)
    // y agrega su posición exacta al final si no está en el top 10.
    suspend fun obtenerRanking(): List<RankingEntry> = api.obtenerRanking(SessionManager.usuarioId)
}

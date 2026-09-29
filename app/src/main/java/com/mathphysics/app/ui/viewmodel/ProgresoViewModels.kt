package com.mathphysics.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mathphysics.app.data.model.ErrorPendiente
import com.mathphysics.app.data.model.Insignia
import com.mathphysics.app.data.model.Racha
import com.mathphysics.app.data.model.RankingEntry
import com.mathphysics.app.data.model.Recompensas
import com.mathphysics.app.data.repository.ProgresoRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.io.IOException

private const val ERROR_CONEXION = "No se pudo conectar al servidor"

class RachaViewModel(private val repo: ProgresoRepository = ProgresoRepository()) : ViewModel() {
    private val _estado = MutableStateFlow<UiState<Racha>>(UiState.Cargando)
    val estado: StateFlow<UiState<Racha>> = _estado

    init { cargar() }

    fun cargar() {
        viewModelScope.launch {
            _estado.value = try {
                UiState.Exito(repo.obtenerRacha())
            } catch (e: IOException) {
                UiState.Error(ERROR_CONEXION)
            } catch (e: Exception) {
                UiState.Error(e.message ?: "Error al cargar la racha")
            }
        }
    }
}

class RecompensasViewModel(private val repo: ProgresoRepository = ProgresoRepository()) : ViewModel() {
    private val _estado = MutableStateFlow<UiState<Recompensas>>(UiState.Cargando)
    val estado: StateFlow<UiState<Recompensas>> = _estado

    init { cargar() }

    fun cargar() {
        viewModelScope.launch {
            _estado.value = try {
                UiState.Exito(repo.obtenerRecompensas())
            } catch (e: IOException) {
                UiState.Error(ERROR_CONEXION)
            } catch (e: Exception) {
                UiState.Error(e.message ?: "Error al cargar las recompensas")
            }
        }
    }
}

class InsigniasViewModel(private val repo: ProgresoRepository = ProgresoRepository()) : ViewModel() {
    private val _estado = MutableStateFlow<UiState<List<Insignia>>>(UiState.Cargando)
    val estado: StateFlow<UiState<List<Insignia>>> = _estado

    init { cargar() }

    fun cargar() {
        viewModelScope.launch {
            _estado.value = try {
                UiState.Exito(repo.obtenerInsignias())
            } catch (e: IOException) {
                UiState.Error(ERROR_CONEXION)
            } catch (e: Exception) {
                UiState.Error(e.message ?: "Error al cargar las insignias")
            }
        }
    }
}

class RepasoViewModel(private val repo: ProgresoRepository = ProgresoRepository()) : ViewModel() {
    private val _estado = MutableStateFlow<UiState<List<ErrorPendiente>>>(UiState.Cargando)
    val estado: StateFlow<UiState<List<ErrorPendiente>>> = _estado

    init { cargar() }

    fun cargar() {
        viewModelScope.launch {
            _estado.value = try {
                UiState.Exito(repo.obtenerRepaso())
            } catch (e: IOException) {
                UiState.Error(ERROR_CONEXION)
            } catch (e: Exception) {
                UiState.Error(e.message ?: "Error al cargar el repaso")
            }
        }
    }
}

class RankingViewModel(private val repo: ProgresoRepository = ProgresoRepository()) : ViewModel() {
    private val _estado = MutableStateFlow<UiState<List<RankingEntry>>>(UiState.Cargando)
    val estado: StateFlow<UiState<List<RankingEntry>>> = _estado

    init { cargar() }

    fun cargar() {
        viewModelScope.launch {
            _estado.value = try {
                UiState.Exito(repo.obtenerRanking())
            } catch (e: IOException) {
                UiState.Error(ERROR_CONEXION)
            } catch (e: Exception) {
                UiState.Error(e.message ?: "Error al cargar el ranking")
            }
        }
    }
}

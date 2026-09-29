package com.mathphysics.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mathphysics.app.data.model.PreguntaTeorica
import com.mathphysics.app.data.model.RespuestaPreguntaTeoricaResultado
import com.mathphysics.app.data.repository.ContenidoRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.io.IOException

class PreguntasTeoricasViewModel(
    private val subtemaId: Int,
    private val repo: ContenidoRepository = ContenidoRepository(),
) : ViewModel() {

    private val _estado = MutableStateFlow<UiState<List<PreguntaTeorica>>>(UiState.Cargando)
    val estado: StateFlow<UiState<List<PreguntaTeorica>>> = _estado

    private val _resultado = MutableStateFlow<RespuestaPreguntaTeoricaResultado?>(null)
    val resultado: StateFlow<RespuestaPreguntaTeoricaResultado?> = _resultado

    init {
        cargarPreguntas()
    }

    fun cargarPreguntas() {
        viewModelScope.launch {
            _estado.value = UiState.Cargando
            _estado.value = try {
                UiState.Exito(repo.obtenerPreguntasTeoricas(subtemaId))
            } catch (e: IOException) {
                UiState.Error("No se pudo conectar al servidor")
            } catch (e: Exception) {
                UiState.Error(e.message ?: "No se pudieron cargar las preguntas")
            }
        }
    }

    fun responder(preguntaId: Int, opcionId: Int) {
        viewModelScope.launch {
            try {
                _resultado.value = repo.responderPreguntaTeorica(preguntaId, opcionId)
            } catch (e: Exception) {
                // se queda sin resultado; la UI puede reintentar
            }
        }
    }

    fun limpiarResultado() {
        _resultado.value = null
    }
}

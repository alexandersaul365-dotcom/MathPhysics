package com.mathphysics.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mathphysics.app.data.model.Ejercicio
import com.mathphysics.app.data.model.RespuestaResultado
import com.mathphysics.app.data.repository.ContenidoRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

data class FlowEjercicios(
    val ejercicios: List<Ejercicio>,
    val indiceActual: Int,
    val resultadoActual: RespuestaResultado?,
) {
    val ejercicioActual: Ejercicio? get() = ejercicios.getOrNull(indiceActual)
    val esUltimo: Boolean get() = indiceActual >= ejercicios.lastIndex
}

class EjerciciosFlowViewModel(
    private val subtemaId: Int,
    private val repo: ContenidoRepository = ContenidoRepository(),
) : ViewModel() {

    private val _estado = MutableStateFlow<UiState<FlowEjercicios>>(UiState.Cargando)
    val estado: StateFlow<UiState<FlowEjercicios>> = _estado

    init {
        cargar()
    }

    // Pública: la pantalla la llama para pedir un lote fresco (ej. después de
    // que un ejercicio ya no estaba disponible, o si el usuario lo pide).
    fun cargar() {
        viewModelScope.launch {
            _estado.value = UiState.Cargando
            _estado.value = try {
                val ejercicios = repo.listarEjercicios(subtemaId)
                if (ejercicios.isEmpty()) {
                    UiState.Error("Todavía no hay ejercicios publicados para este tema")
                } else {
                    UiState.Exito(FlowEjercicios(ejercicios, 0, null))
                }
            } catch (e: IOException) {
                UiState.Error("No se pudo conectar al servidor")
            } catch (e: Exception) {
                UiState.Error(e.message ?: "Error al cargar los ejercicios")
            }
        }
    }

    fun responder(respuesta: Map<String, Any>, tiempoSegundos: Int) {
        val actual = (_estado.value as? UiState.Exito)?.datos ?: return
        val ejercicio = actual.ejercicioActual ?: return

        viewModelScope.launch {
            try {
                val resultado = repo.responder(ejercicio.id, respuesta, tiempoSegundos)
                _estado.value = UiState.Exito(actual.copy(resultadoActual = resultado))
            } catch (e: HttpException) {
                if (e.code() == 404) {
                    // El ejercicio ya no está disponible (se generó un lote nuevo
                    // en otro lado, o se venció) — no lo dejamos "muerto" en
                    // pantalla: se pide un lote fresco automáticamente.
                    cargar()
                } else {
                    _estado.value = UiState.Error("Error del servidor (${e.code()})")
                }
            } catch (e: Exception) {
                _estado.value = UiState.Error(e.message ?: "No se pudo enviar la respuesta")
            }
        }
    }

    // Devuelve true si avanzó a un siguiente ejercicio, false si ya era el último.
    fun siguiente(): Boolean {
        val actual = (_estado.value as? UiState.Exito)?.datos ?: return false
        if (actual.esUltimo) return false
        _estado.value = UiState.Exito(actual.copy(indiceActual = actual.indiceActual + 1, resultadoActual = null))
        return true
    }
}

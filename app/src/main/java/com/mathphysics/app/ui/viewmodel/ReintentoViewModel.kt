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

class ReintentoViewModel(
    private val ejercicioId: Int,
    private val repo: ContenidoRepository = ContenidoRepository(),
) : ViewModel() {

    private val _estado = MutableStateFlow<UiState<Ejercicio>>(UiState.Cargando)
    val estado: StateFlow<UiState<Ejercicio>> = _estado

    private val _resultado = MutableStateFlow<RespuestaResultado?>(null)
    val resultado: StateFlow<RespuestaResultado?> = _resultado

    init {
        viewModelScope.launch {
            _estado.value = try {
                UiState.Exito(repo.obtenerEjercicio(ejercicioId))
            } catch (e: HttpException) {
                if (e.code() == 404) {
                    UiState.Error("Este ejercicio ya no está disponible para reintentar — puede que se haya generado un lote nuevo. Vuelve a Repaso e inténtalo de nuevo.")
                } else {
                    UiState.Error("Error del servidor (${e.code()})")
                }
            } catch (e: Exception) {
                UiState.Error(e.message ?: "No se pudo cargar el ejercicio")
            }
        }
    }

    fun responder(respuesta: Map<String, Any>, tiempoSegundos: Int) {
        viewModelScope.launch {
            try {
                _resultado.value = repo.responder(ejercicioId, respuesta, tiempoSegundos)
            } catch (e: Exception) {
                // Deja el estado como estaba; el usuario puede reintentar el envío.
            }
        }
    }
}

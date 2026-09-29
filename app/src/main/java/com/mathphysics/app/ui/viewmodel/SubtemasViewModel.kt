package com.mathphysics.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mathphysics.app.data.model.Subtema
import com.mathphysics.app.data.repository.ContenidoRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.io.IOException

class SubtemasViewModel(
    private val temaId: Int,
    private val repo: ContenidoRepository = ContenidoRepository(),
) : ViewModel() {

    private val _estado = MutableStateFlow<UiState<List<Subtema>>>(UiState.Cargando)
    val estado: StateFlow<UiState<List<Subtema>>> = _estado

    init {
        cargarSubtemas()
    }

    fun cargarSubtemas() {
        viewModelScope.launch {
            _estado.value = UiState.Cargando
            _estado.value = try {
                UiState.Exito(repo.obtenerSubtemas(temaId))
            } catch (e: IOException) {
                UiState.Error("No se pudo conectar al servidor")
            } catch (e: Exception) {
                UiState.Error(e.message ?: "Error al cargar los subtemas")
            }
        }
    }
}

package com.mathphysics.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mathphysics.app.data.model.Materia
import com.mathphysics.app.data.repository.ContenidoRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.io.IOException

class MisMateriasViewModel(
    private val repo: ContenidoRepository = ContenidoRepository(),
) : ViewModel() {

    private val _estado = MutableStateFlow<UiState<List<Materia>>>(UiState.Cargando)
    val estado: StateFlow<UiState<List<Materia>>> = _estado

    init {
        cargarMaterias()
    }

    fun cargarMaterias() {
        viewModelScope.launch {
            _estado.value = UiState.Cargando
            _estado.value = try {
                UiState.Exito(repo.obtenerMaterias())
            } catch (e: IOException) {
                UiState.Error("No se pudo conectar al servidor. Revisa que el backend esté corriendo y que la IP en RetrofitClient sea la correcta.")
            } catch (e: Exception) {
                UiState.Error(e.message ?: "Error al cargar las materias")
            }
        }
    }
}

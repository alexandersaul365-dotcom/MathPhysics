package com.mathphysics.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mathphysics.app.data.model.SubtemaConEjercicios
import com.mathphysics.app.data.repository.ContenidoRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.io.IOException

class EjerciciosDisponiblesViewModel(
    private val repo: ContenidoRepository = ContenidoRepository(),
) : ViewModel() {
    private val _estado = MutableStateFlow<UiState<List<SubtemaConEjercicios>>>(UiState.Cargando)
    val estado: StateFlow<UiState<List<SubtemaConEjercicios>>> = _estado

    init { cargar() }

    fun cargar() {
        viewModelScope.launch {
            _estado.value = try {
                UiState.Exito(repo.listarSubtemasConEjercicios())
            } catch (e: IOException) {
                UiState.Error("No se pudo conectar al servidor")
            } catch (e: Exception) {
                UiState.Error(e.message ?: "Error al cargar los temas con ejercicios")
            }
        }
    }
}

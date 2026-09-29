package com.mathphysics.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mathphysics.app.data.model.Leccion
import com.mathphysics.app.data.repository.ContenidoRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

class LeccionViewModel(
    private val subtemaId: Int,
    private val repo: ContenidoRepository = ContenidoRepository(),
) : ViewModel() {

    private val _estado = MutableStateFlow<UiState<Leccion>>(UiState.Cargando)
    val estado: StateFlow<UiState<Leccion>> = _estado

    init {
        cargarLeccion()
    }

    fun cargarLeccion() {
        viewModelScope.launch {
            _estado.value = UiState.Cargando
            _estado.value = try {
                UiState.Exito(repo.obtenerLeccion(subtemaId))
            } catch (e: HttpException) {
                if (e.code() == 404) {
                    UiState.Error("Aún no hay contenido publicado para este subtema")
                } else {
                    UiState.Error("Error del servidor (${e.code()})")
                }
            } catch (e: IOException) {
                UiState.Error("No se pudo conectar al servidor")
            } catch (e: Exception) {
                UiState.Error(e.message ?: "No se pudo cargar la lección")
            }
        }
    }
}

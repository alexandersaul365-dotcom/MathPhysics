package com.mathphysics.app.ui.viewmodel

sealed class UiState<out T> {
    data object Cargando : UiState<Nothing>()
    data class Exito<T>(val datos: T) : UiState<T>()
    data class Error(val mensaje: String) : UiState<Nothing>()
}

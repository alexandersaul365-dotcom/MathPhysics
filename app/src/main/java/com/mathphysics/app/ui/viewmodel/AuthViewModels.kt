package com.mathphysics.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mathphysics.app.data.repository.AuthRepository
import com.mathphysics.app.data.repository.mensajeDeError
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

sealed class AuthUiState {
    data object Inactivo : AuthUiState()
    data object Cargando : AuthUiState()
    data object Exito : AuthUiState()
    data class Error(val mensaje: String) : AuthUiState()
}

class LoginViewModel(
    private val repo: AuthRepository = AuthRepository(),
) : ViewModel() {

    private val _estado = MutableStateFlow<AuthUiState>(AuthUiState.Inactivo)
    val estado: StateFlow<AuthUiState> = _estado

    fun iniciarSesion(nombreUsuario: String, password: String) {
        if (nombreUsuario.isBlank() || password.isBlank()) {
            _estado.value = AuthUiState.Error("Ingresa tu usuario y tu contraseña")
            return
        }

        viewModelScope.launch {
            _estado.value = AuthUiState.Cargando
            _estado.value = try {
                repo.iniciarSesion(nombreUsuario, password)
                AuthUiState.Exito
            } catch (e: HttpException) {
                AuthUiState.Error(mensajeDeError(e))
            } catch (e: IOException) {
                AuthUiState.Error("No se pudo conectar al servidor. Revisa tu conexión.")
            } catch (e: Exception) {
                AuthUiState.Error(e.message ?: "No se pudo iniciar sesión")
            }
        }
    }
}

class RegistroViewModel(
    private val repo: AuthRepository = AuthRepository(),
) : ViewModel() {

    private val _estado = MutableStateFlow<AuthUiState>(AuthUiState.Inactivo)
    val estado: StateFlow<AuthUiState> = _estado

    // Mismas reglas que valida el backend (RQNF1-3) — se revisan aquí antes
    // de golpear la red para dar retroalimentación inmediata.
    fun registrar(nombreUsuario: String, password: String, confirmarPassword: String) {
        if (nombreUsuario.length < 4 || nombreUsuario.length > 20) {
            _estado.value = AuthUiState.Error("El usuario debe tener entre 4 y 20 caracteres")
            return
        }
        if (password.length < 8 || password.length > 64) {
            _estado.value = AuthUiState.Error("La contraseña debe tener entre 8 y 64 caracteres")
            return
        }
        if (password != confirmarPassword) {
            _estado.value = AuthUiState.Error("Las contraseñas no coinciden")
            return
        }

        viewModelScope.launch {
            _estado.value = AuthUiState.Cargando
            _estado.value = try {
                repo.registrar(nombreUsuario, password)
                AuthUiState.Exito
            } catch (e: HttpException) {
                AuthUiState.Error(mensajeDeError(e))
            } catch (e: IOException) {
                AuthUiState.Error("No se pudo conectar al servidor. Revisa tu conexión.")
            } catch (e: Exception) {
                AuthUiState.Error(e.message ?: "No se pudo completar el registro")
            }
        }
    }
}

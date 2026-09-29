package com.mathphysics.app.data.repository

import com.google.gson.Gson
import com.mathphysics.app.data.local.SessionManager
import com.mathphysics.app.data.model.LoginRequest
import com.mathphysics.app.data.model.RegistroRequest
import com.mathphysics.app.data.model.SesionResultado
import com.mathphysics.app.data.remote.ApiService
import com.mathphysics.app.data.remote.RetrofitClient
import retrofit2.HttpException

class AuthRepository(
    private val api: ApiService = RetrofitClient.apiService,
) {
    // El backend hace auto-login al registrarse (devuelve token igual que
    // el login), así que registrar() deja al usuario con sesión activa de
    // una sola vez, sin que tenga que volver a teclear su contraseña.
    suspend fun registrar(nombreUsuario: String, password: String): SesionResultado {
        val resultado = api.registrar(RegistroRequest(nombreUsuario, password))
        guardarSesion(resultado)
        return resultado
    }

    suspend fun iniciarSesion(nombreUsuario: String, password: String): SesionResultado {
        val resultado = api.iniciarSesion(LoginRequest(nombreUsuario, password))
        guardarSesion(resultado)
        return resultado
    }

    suspend fun cerrarSesion() {
        try {
            api.cerrarSesion()
        } catch (_: Exception) {
            // Si el logout en el servidor falla (sin internet, token ya
            // vencido, etc.) igual cerramos la sesión localmente — el
            // usuario pidió salir y no debe quedarse atorado en la app.
        } finally {
            SessionManager.cerrarSesion()
        }
    }

    private fun guardarSesion(resultado: SesionResultado) {
        SessionManager.guardarSesion(
            token = resultado.token,
            usuarioId = resultado.usuario.id,
            nombreUsuario = resultado.usuario.nombreUsuario,
            rol = resultado.usuario.rol,
        )
    }
}

/**
 * El backend manda mensajes de error específicos en el body ("Usuario o
 * contraseña incorrectos", "Cuenta bloqueada temporalmente...", etc.) — esta
 * función los extrae de un HttpException para mostrarlos tal cual en la UI
 * en vez de un genérico "Error 401".
 */
fun mensajeDeError(e: HttpException): String {
    return try {
        val body = e.response()?.errorBody()?.string()
        val json = Gson().fromJson(body, Map::class.java)
        (json?.get("error") as? String) ?: "Error del servidor (${e.code()})"
    } catch (_: Exception) {
        "Error del servidor (${e.code()})"
    }
}

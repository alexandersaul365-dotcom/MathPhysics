package com.mathphysics.app.data.local

import android.content.Context
import android.content.SharedPreferences

/**
 * Guarda la sesión del usuario (token JWT + sus datos) en SharedPreferences
 * para que sobreviva a que se cierre o reinicie la app — la sesión NO debe
 * cerrarse sola, solo cuando el usuario toque "Cerrar sesión" explícitamente
 * (ver cerrarSesion()). El backend firma el JWT con expiración muy larga
 * (365 días, ver JWT_EXPIRES_IN) precisamente para que esto sea así.
 *
 * Se inicializa una sola vez, en MainActivity.onCreate(), con el contexto de
 * la aplicación (nunca el de una Activity, para no filtrar memoria) — así
 * queda disponible tanto para las pantallas de Compose como para el
 * interceptor de Retrofit, que no tiene acceso a un Context propio.
 */
object SessionManager {
    private const val PREFS_NAME = "mathphysics_sesion"
    private const val KEY_TOKEN = "token"
    private const val KEY_USUARIO_ID = "usuario_id"
    private const val KEY_NOMBRE_USUARIO = "nombre_usuario"
    private const val KEY_ROL = "rol"

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    val token: String?
        get() = prefs.getString(KEY_TOKEN, null)

    val usuarioId: Int
        get() = prefs.getInt(KEY_USUARIO_ID, -1)

    val nombreUsuario: String
        get() = prefs.getString(KEY_NOMBRE_USUARIO, "") ?: ""

    // De momento no se usa para cambiar de pantalla — un admin entra como
    // cualquier estudiante mientras no exista el panel de administrador —
    // pero se guarda desde ya para cuando ese panel se construya.
    val rol: String
        get() = prefs.getString(KEY_ROL, "estudiante") ?: "estudiante"

    fun haySesionActiva(): Boolean = token != null && usuarioId != -1

    fun guardarSesion(token: String, usuarioId: Int, nombreUsuario: String, rol: String) {
        prefs.edit()
            .putString(KEY_TOKEN, token)
            .putInt(KEY_USUARIO_ID, usuarioId)
            .putString(KEY_NOMBRE_USUARIO, nombreUsuario)
            .putString(KEY_ROL, rol)
            .apply()
    }

    fun cerrarSesion() {
        prefs.edit().clear().apply()
    }
}

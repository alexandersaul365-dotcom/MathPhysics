package com.mathphysics.app.data.model

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    @SerializedName("nombre_usuario") val nombreUsuario: String,
    val password: String,
)

data class RegistroRequest(
    @SerializedName("nombre_usuario") val nombreUsuario: String,
    val password: String,
)

data class UsuarioSesion(
    val id: Int,
    @SerializedName("nombre_usuario") val nombreUsuario: String,
    val rol: String,
)

// Login y registro devuelven exactamente esta misma forma — el backend
// hace auto-login justo después de registrar, así que la app puede tratar
// "me acabo de registrar" igual que "acabo de iniciar sesión".
data class SesionResultado(
    val token: String,
    val usuario: UsuarioSesion,
)

data class MensajeResultado(val mensaje: String)

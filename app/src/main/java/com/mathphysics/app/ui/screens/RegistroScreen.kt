package com.mathphysics.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mathphysics.app.ui.theme.ErrorRed
import com.mathphysics.app.ui.theme.Fondo
import com.mathphysics.app.ui.theme.Teal
import com.mathphysics.app.ui.theme.TextoPrimario
import com.mathphysics.app.ui.theme.TextoSecundario
import com.mathphysics.app.ui.viewmodel.AuthUiState
import com.mathphysics.app.ui.viewmodel.RegistroViewModel

@Composable
fun RegistroScreen(
    onRegistroExitoso: () -> Unit,
    onIrALogin: () -> Unit,
    viewModel: RegistroViewModel = viewModel(),
) {
    var nombreUsuario by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmarPassword by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    val estado by viewModel.estado.collectAsState()
    val cargando = estado is AuthUiState.Cargando

    LaunchedEffect(estado) {
        if (estado is AuthUiState.Exito) onRegistroExitoso()
    }

    Box(modifier = Modifier.fillMaxSize().background(Fondo)) {
        IconButton(
            onClick = onIrALogin,
            enabled = !cargando,
            modifier = Modifier.padding(top = 44.dp, start = 12.dp),
        ) {
            Icon(Icons.Default.ArrowBack, contentDescription = "Volver a inicio de sesión", tint = TextoPrimario)
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                "Crea tu cuenta",
                style = MaterialTheme.typography.headlineMedium,
                color = Teal,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "Regístrate para empezar a practicar",
                style = MaterialTheme.typography.bodyMedium,
                color = TextoSecundario,
            )

            Spacer(Modifier.height(32.dp))

            OutlinedTextField(
                value = nombreUsuario,
                onValueChange = { nombreUsuario = it },
                label = { Text("Usuario") },
                supportingText = { Text("Entre 4 y 20 caracteres", color = TextoSecundario) },
                singleLine = true,
                enabled = !cargando,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Teal,
                    unfocusedBorderColor = Teal.copy(alpha = 0.5f),
                    focusedLabelColor = Teal,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(12.dp))

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Contraseña") },
                supportingText = { Text("Entre 8 y 64 caracteres", color = TextoSecundario) },
                singleLine = true,
                enabled = !cargando,
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = if (passwordVisible) "Ocultar contraseña" else "Mostrar contraseña",
                            tint = TextoSecundario,
                        )
                    }
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Teal,
                    unfocusedBorderColor = Teal.copy(alpha = 0.5f),
                    focusedLabelColor = Teal,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(12.dp))

            OutlinedTextField(
                value = confirmarPassword,
                onValueChange = { confirmarPassword = it },
                label = { Text("Confirmar contraseña") },
                singleLine = true,
                enabled = !cargando,
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Teal,
                    unfocusedBorderColor = Teal.copy(alpha = 0.5f),
                    focusedLabelColor = Teal,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            if (estado is AuthUiState.Error) {
                Spacer(Modifier.height(12.dp))
                Text(
                    (estado as AuthUiState.Error).mensaje,
                    color = ErrorRed,
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            Spacer(Modifier.height(24.dp))

            Button(
                onClick = { viewModel.registrar(nombreUsuario.trim(), password, confirmarPassword) },
                enabled = !cargando,
                colors = ButtonDefaults.buttonColors(containerColor = Teal),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth().height(52.dp),
            ) {
                if (cargando) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
                } else {
                    Text("Registrarme", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

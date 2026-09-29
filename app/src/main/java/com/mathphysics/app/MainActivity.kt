package com.mathphysics.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.mathphysics.app.data.local.SessionManager
import com.mathphysics.app.navigation.MathPhysicsNavGraph
import com.mathphysics.app.ui.theme.MathPhysicsTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        // Sesión persistente: se lee UNA vez aquí, con el contexto de la
        // aplicación, antes de decidir si la app abre en Login o de una vez
        // en la pantalla principal (ver NavGraph). No debe cerrarse sola —
        // solo cuando el usuario toque "Cerrar sesión".
        SessionManager.init(applicationContext)
        enableEdgeToEdge()
        setContent {
            MathPhysicsTheme {
                MathPhysicsNavGraph()
            }
        }
    }
}

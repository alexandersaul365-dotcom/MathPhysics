package com.mathphysics.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.mathphysics.app.navigation.MathPhysicsNavGraph
import com.mathphysics.app.ui.theme.MathPhysicsTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MathPhysicsTheme {
                MathPhysicsNavGraph()
            }
        }
    }
}

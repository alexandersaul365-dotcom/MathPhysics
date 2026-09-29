package com.mathphysics.app.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver

// Cuánto tiempo mínimo debe pasar entre dos refrescos para que valgan la pena.
// Evita refrescar de más cuando el sistema pausa/reanuda la Activity sin que
// el usuario realmente haya salido de la pantalla (bloquear el celular,
// deslizar la barra de notificaciones, cambiar de app un segundo, etc.) —
// eso también dispara ON_RESUME, aunque no sea "volver a la pantalla".
private const val VENTANA_MINIMA_MS = 3000L

/**
 * Corre [onResume] cuando la pantalla vuelve a estar visible después de al
 * menos [VENTANA_MINIMA_MS] desde la última vez — no en cada ON_RESUME literal,
 * para no refrescar de más por pausas del sistema que no son navegación real.
 * Úsalo para refrescar datos que pudieron cambiar mientras el usuario estaba
 * en otra pantalla — por ejemplo, el ranking o el XP después de un ejercicio.
 */
@Composable
fun OnResumeEffect(onResume: () -> Unit) {
    val onResumeActualizado by rememberUpdatedState(onResume)
    val lifecycleOwner = LocalLifecycleOwner.current
    val ultimaVez = remember { longArrayOf(System.currentTimeMillis()) }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                val ahora = System.currentTimeMillis()
                if (ahora - ultimaVez[0] >= VENTANA_MINIMA_MS) {
                    ultimaVez[0] = ahora
                    onResumeActualizado()
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }
}

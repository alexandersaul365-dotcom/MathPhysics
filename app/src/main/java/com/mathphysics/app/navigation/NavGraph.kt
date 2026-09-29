package com.mathphysics.app.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.mathphysics.app.data.local.SessionManager
import com.mathphysics.app.ui.screens.EjerciciosDisponiblesScreen
import com.mathphysics.app.ui.screens.EjerciciosFlowScreen
import com.mathphysics.app.ui.screens.InsigniasScreen
import com.mathphysics.app.ui.screens.LeccionScreen
import com.mathphysics.app.ui.screens.LoginScreen
import com.mathphysics.app.ui.screens.MisMateriasScreen
import com.mathphysics.app.ui.screens.PreguntasTeoricasScreen
import com.mathphysics.app.ui.screens.RachaScreen
import com.mathphysics.app.ui.screens.RankingScreen
import com.mathphysics.app.ui.screens.RecompensasScreen
import com.mathphysics.app.ui.screens.RegistroScreen
import com.mathphysics.app.ui.screens.ReintentoScreen
import com.mathphysics.app.ui.screens.RepasoErroresScreen
import com.mathphysics.app.ui.screens.SubtemasScreen
import com.mathphysics.app.ui.screens.TemasModuloScreen
import java.net.URLDecoder
import java.net.URLEncoder

private object Rutas {
    const val LOGIN = "login"
    const val REGISTRO = "registro"
    const val MATERIAS = "materias"
    const val TEMAS = "temas/{materiaId}/{materiaNombre}"
    const val SUBTEMAS = "subtemas/{temaId}/{temaNombre}"
    const val LECCION = "leccion/{subtemaId}"
    const val PREGUNTAS_TEORICAS = "preguntas_teoricas/{subtemaId}"
    const val EJERCICIOS = "ejercicios/{subtemaId}"
    const val EJERCICIOS_DISPONIBLES = "ejercicios_disponibles"
    const val RACHA = "racha"
    const val RECOMPENSAS = "recompensas"
    const val INSIGNIAS = "insignias"
    const val RANKING = "ranking"
    const val REPASO = "repaso"
    const val REINTENTO = "reintento/{ejercicioId}/{respuestaAnterior}"
}

private fun encode(texto: String) = URLEncoder.encode(texto, "UTF-8")
private fun decode(texto: String) = URLDecoder.decode(texto, "UTF-8")

@Composable
fun MathPhysicsNavGraph() {
    val navController = rememberNavController()

    // La sesión no debe cerrarse sola — se lee UNA vez al abrir la app; si
    // ya había un login guardado (de una vez anterior), se entra directo a
    // Mis Materias sin pasar por Login. Un usuario admin entra exactamente
    // igual que uno estudiante: todavía no existe panel de administrador.
    val inicio = if (SessionManager.haySesionActiva()) Rutas.MATERIAS else Rutas.LOGIN

    CompositionLocalProvider(LocalNavController provides navController) {
        NavHost(navController = navController, startDestination = inicio) {
            composable(Rutas.LOGIN) {
                LoginScreen(
                    onLoginExitoso = {
                        navController.navigate(Rutas.MATERIAS) {
                            popUpTo(0) { inclusive = true }
                            launchSingleTop = true
                        }
                    },
                    onIrARegistro = { navController.navigate(Rutas.REGISTRO) },
                )
            }

            composable(Rutas.REGISTRO) {
                RegistroScreen(
                    onRegistroExitoso = {
                        navController.navigate(Rutas.MATERIAS) {
                            popUpTo(0) { inclusive = true }
                            launchSingleTop = true
                        }
                    },
                    onIrALogin = { navController.popBackStack() },
                )
            }

            composable(Rutas.MATERIAS) {
                MisMateriasScreen(
                    onMateriaClick = { materia ->
                        navController.navigate("temas/${materia.id}/${encode(materia.nombre)}")
                    },
                    onVerRacha = { navController.navigate(Rutas.RACHA) },
                    onSesionCerrada = {
                        navController.navigate(Rutas.LOGIN) {
                            popUpTo(0) { inclusive = true }
                            launchSingleTop = true
                        }
                    },
                )
            }

            composable(
                route = Rutas.TEMAS,
                arguments = listOf(
                    navArgument("materiaId") { type = NavType.StringType },
                    navArgument("materiaNombre") { type = NavType.StringType },
                ),
            ) { backStackEntry ->
                val materiaId = backStackEntry.arguments?.getString("materiaId") ?: return@composable
                val materiaNombre = decode(backStackEntry.arguments?.getString("materiaNombre") ?: "")
                TemasModuloScreen(
                    materiaId = materiaId,
                    materiaNombre = materiaNombre,
                    onTemaClick = { tema -> navController.navigate("subtemas/${tema.id}/${encode(tema.nombre)}") },
                    onBack = { navController.popBackStack() },
                )
            }

            composable(
                route = Rutas.SUBTEMAS,
                arguments = listOf(
                    navArgument("temaId") { type = NavType.IntType },
                    navArgument("temaNombre") { type = NavType.StringType },
                ),
            ) { backStackEntry ->
                val temaId = backStackEntry.arguments?.getInt("temaId") ?: return@composable
                val temaNombre = decode(backStackEntry.arguments?.getString("temaNombre") ?: "")
                SubtemasScreen(
                    temaId = temaId,
                    temaNombre = temaNombre,
                    onSubtemaClick = { subtema -> navController.navigate("leccion/${subtema.id}") },
                    onBack = { navController.popBackStack() },
                )
            }

            composable(
                route = Rutas.LECCION,
                arguments = listOf(navArgument("subtemaId") { type = NavType.IntType }),
            ) { backStackEntry ->
                val subtemaId = backStackEntry.arguments?.getInt("subtemaId") ?: return@composable
                LeccionScreen(
                    subtemaId = subtemaId,
                    onIrAEjercicios = { idParaEjercicios -> navController.navigate("preguntas_teoricas/$idParaEjercicios") },
                    onBack = { navController.popBackStack() },
                )
            }

            composable(
                route = Rutas.PREGUNTAS_TEORICAS,
                arguments = listOf(navArgument("subtemaId") { type = NavType.IntType }),
            ) { backStackEntry ->
                val subtemaId = backStackEntry.arguments?.getInt("subtemaId") ?: return@composable
                PreguntasTeoricasScreen(
                    subtemaId = subtemaId,
                    onTerminar = { navController.popBackStack(Rutas.SUBTEMAS, inclusive = false) },
                    onBack = { navController.popBackStack() },
                )
            }

            composable(Rutas.EJERCICIOS_DISPONIBLES) {
                EjerciciosDisponiblesScreen(
                    onSubtemaClick = { subtema -> navController.navigate("ejercicios/${subtema.subtemaId}") },
                )
            }

            composable(
                route = Rutas.EJERCICIOS,
                arguments = listOf(navArgument("subtemaId") { type = NavType.IntType }),
            ) { backStackEntry ->
                val subtemaId = backStackEntry.arguments?.getInt("subtemaId") ?: return@composable
                EjerciciosFlowScreen(
                    subtemaId = subtemaId,
                    onBack = { navController.popBackStack() },
                    onTerminado = {
                        // Antes se usaba graph.startDestinationId, pero ese id ya
                        // no es fijo (ahora puede ser Login o Materias según si
                        // hay sesión activa) — apuntamos a Materias explícitamente.
                        navController.navigate(Rutas.EJERCICIOS_DISPONIBLES) {
                            popUpTo(Rutas.MATERIAS) { inclusive = false }
                            launchSingleTop = true
                        }
                    },
                )
            }

            composable(Rutas.RACHA) {
                RachaScreen(
                    onBack = { navController.popBackStack() },
                    onPracticarAhora = { navController.navigate(Rutas.MATERIAS) },
                )
            }

            composable(Rutas.RECOMPENSAS) {
                RecompensasScreen(onBack = { navController.popBackStack() })
            }

            composable(Rutas.INSIGNIAS) {
                InsigniasScreen(
                    onBack = { navController.popBackStack() },
                    onVerRecompensas = { navController.navigate(Rutas.RECOMPENSAS) },
                )
            }

            composable(Rutas.RANKING) {
                RankingScreen(onBack = { navController.popBackStack() })
            }

            composable(Rutas.REPASO) {
                RepasoErroresScreen(
                    onBack = { navController.popBackStack() },
                    onReintentar = { error ->
                        navController.navigate("reintento/${error.ejercicioId}/${encode(error.respuestaResumen)}")
                    },
                )
            }

            composable(
                route = Rutas.REINTENTO,
                arguments = listOf(
                    navArgument("ejercicioId") { type = NavType.IntType },
                    navArgument("respuestaAnterior") { type = NavType.StringType },
                ),
            ) { backStackEntry ->
                val ejercicioId = backStackEntry.arguments?.getInt("ejercicioId") ?: return@composable
                val respuestaAnterior = decode(backStackEntry.arguments?.getString("respuestaAnterior") ?: "")
                ReintentoScreen(
                    ejercicioId = ejercicioId,
                    respuestaAnterior = respuestaAnterior,
                    onBack = { navController.popBackStack() },
                    onExito = { navController.popBackStack() },
                )
            }
        }
    }
}

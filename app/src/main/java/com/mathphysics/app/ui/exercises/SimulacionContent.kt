package com.mathphysics.app.ui.exercises

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.unit.sp
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mathphysics.app.data.model.Ejercicio
import com.mathphysics.app.data.model.RespuestaResultado
import com.mathphysics.app.ui.theme.*
import kotlin.math.roundToInt

// ============================================================================
// Despachador: cada tipo de simulación tiene su propio diagrama y su propio
// control (slider continuo o selector de valores discretos), pero todas
// comparten el mismo patrón: valores fijos + un objetivo a lograr ajustando
// la incógnita, y se califican contra el valor real que el estudiante dejó.
// ============================================================================
// ---------------------------------------------------------------------------
// Colores con contraste en AMBOS temas (claro y oscuro). Los tokens de
// Color.kt ya cambian solos con el tema; estos cuatro cubren los casos donde
// el token directo no alcanza contraste suficiente (Teal/Amber sobre blanco)
// o donde antes había colores fijos que desaparecían en modo oscuro.
// ---------------------------------------------------------------------------
private fun trazo(): Color = TextoPrimario                       // líneas, cables, texto del diagrama
private fun acento(): Color = if (AppTheme.modoOscuro) Teal else TealDark
private fun colorObjetivo(): Color = if (AppTheme.modoOscuro) Amber else Color(0xFF8A5A00)
private fun sobreAcento(): Color = if (AppTheme.modoOscuro) Fondo else Color.White

@Composable
fun SimulacionContent(
    ejercicio: Ejercicio,
    resultado: RespuestaResultado?,
    onResponder: (Map<String, Any>, Int) -> Unit,
    onSiguiente: () -> Unit,
) {
    val vi = ejercicio.valoresIniciales
    if (vi == null) {
        Text("No se pudo cargar esta simulación", modifier = Modifier.padding(20.dp), color = ErrorRed)
        return
    }

    when (ejercicio.tipoSimulacion) {
        "ley_ohm" -> LeyOhmSimulacion(ejercicio, vi, resultado, onResponder, onSiguiente)
        "segunda_ley_newton" -> NewtonSimulacion(ejercicio, vi, resultado, onResponder, onSiguiente)
        "energia_potencial" -> EnergiaSimulacion(ejercicio, vi, resultado, onResponder, onSiguiente)
        "pitagoras" -> PitagorasSimulacion(ejercicio, vi, resultado, onResponder, onSiguiente)
        "voltaje_serie" -> VoltajeSerieSimulacion(ejercicio, vi, resultado, onResponder, onSiguiente)
        "resistencias_serie" -> ResistenciasSerieSimulacion(ejercicio, vi, resultado, onResponder, onSiguiente)
        else -> Text("Tipo de simulación no soportado", modifier = Modifier.padding(20.dp), color = ErrorRed)
    }
}

// ---------------------------------------------------------------------------
// Marco compartido: enunciado, el diagrama (pasado como contenido), botón de
// confirmar/siguiente, y el mensaje de resultado.
// ---------------------------------------------------------------------------
@Composable
private fun MarcoSimulacion(
    ejercicio: Ejercicio,
    resultado: RespuestaResultado?,
    valorActual: Double,
    onResponder: (Map<String, Any>, Int) -> Unit,
    onSiguiente: () -> Unit,
    diagrama: @Composable () -> Unit,
    control: @Composable () -> Unit,
) {
    val inicioMs = remember(ejercicio.id) { System.currentTimeMillis() }
    val respondido = resultado != null

    Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
        Text(ejercicio.enunciado, style = MaterialTheme.typography.bodyMedium, color = TextoPrimario, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(16.dp))

        Surface(shape = RoundedCornerShape(16.dp), color = SuperficieNeutra, modifier = Modifier.fillMaxWidth()) {
            Box(modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)) { diagrama() }
        }

        Spacer(Modifier.height(20.dp))
        control()
        Spacer(Modifier.height(20.dp))

        Button(
            onClick = {
                if (!respondido) {
                    val segundos = ((System.currentTimeMillis() - inicioMs) / 1000).toInt()
                    onResponder(mapOf("valor" to valorActual), segundos)
                } else onSiguiente()
            },
            colors = ButtonDefaults.buttonColors(containerColor = acento()),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) {
            Text(if (respondido) "Siguiente →" else "Confirmar", color = sobreAcento(), fontWeight = FontWeight.Bold)
        }

        resultado?.let { r ->
            Spacer(Modifier.height(10.dp))
            val texto = when {
                r.correcta -> "¡Lo lograste! +${r.xpOtorgado} XP ✓"
                else -> "No llegaste al objetivo — inténtalo de nuevo la próxima vez"
            }
            Text(texto, color = if (r.correcta) acento() else ErrorRed, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

// ---------------------------------------------------------------------------
// Controles reutilizables: uno para valores continuos (slider), otro para
// valores discretos exactos (E12, baterías) — un selector con flechas, para
// que nunca se pueda elegir un valor inválido.
// ---------------------------------------------------------------------------
@Composable
private fun ControlContinuo(etiqueta: String, valor: Double, unidad: String, min: Double, max: Double, paso: Double, habilitado: Boolean, onChange: (Double) -> Unit) {
    Column {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(etiqueta, style = MaterialTheme.typography.bodyMedium, color = acento(), fontWeight = FontWeight.Bold)
            Text(formatearNumero(valor) + " " + unidad, style = MaterialTheme.typography.titleMedium, color = acento(), fontWeight = FontWeight.Bold)
        }
        Slider(
            value = valor.toFloat(),
            onValueChange = { nuevo ->
                val pasos = ((nuevo - min) / paso).roundToInt()
                onChange((min + pasos * paso).coerceIn(min, max))
            },
            valueRange = min.toFloat()..max.toFloat(),
            enabled = habilitado,
            colors = SliderDefaults.colors(thumbColor = acento(), activeTrackColor = acento(), inactiveTrackColor = TextoSecundario.copy(alpha = 0.35f)),
        )
    }
}

// Arrastra de verdad (Slider de Compose ya recalcula en vivo mientras se
// arrastra, antes de soltar — RQNF18), pero solo puede quedar en uno de los
// valores exactos de `opciones` (serie E12, baterías, etc.) — el arrastre
// se mapea a un índice dentro de la lista, nunca a un valor intermedio.
@Composable
private fun ControlDiscreto(etiqueta: String, valor: Double, unidad: String, opciones: List<Double>, habilitado: Boolean, onChange: (Double) -> Unit) {
    if (opciones.isEmpty()) return
    val indiceActual = opciones.indexOf(valor).let { if (it >= 0) it else 0 }

    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(etiqueta, style = MaterialTheme.typography.bodyMedium, color = acento(), fontWeight = FontWeight.Bold)
            Text(formatearNumero(valor) + " " + unidad, style = MaterialTheme.typography.titleMedium, color = acento(), fontWeight = FontWeight.Bold)
        }
        Slider(
            value = indiceActual.toFloat(),
            onValueChange = { nuevo -> onChange(opciones[nuevo.roundToInt().coerceIn(0, opciones.lastIndex)]) },
            valueRange = 0f..opciones.lastIndex.toFloat(),
            steps = (opciones.size - 2).coerceAtLeast(0),
            enabled = habilitado,
            colors = SliderDefaults.colors(thumbColor = acento(), activeTrackColor = acento(), inactiveTrackColor = TextoSecundario.copy(alpha = 0.35f)),
        )
    }
}

private fun formatearNumero(v: Double): String = if (v == v.toLong().toDouble()) v.toLong().toString() else "%.2f".format(v)

private fun numDe(mapa: Map<String, Any>?, clave: String): Double = (mapa?.get(clave) as? Number)?.toDouble() ?: 0.0

@Suppress("UNCHECKED_CAST")
private fun listaDe(mapa: Map<String, Any>?, clave: String): List<Double> =
    (mapa?.get(clave) as? List<*>)?.mapNotNull { (it as? Number)?.toDouble() } ?: emptyList()

// ============================================================================
// 1. Ley de Ohm — circuito con batería y resistencia
// ============================================================================
@Composable
private fun LeyOhmSimulacion(ejercicio: Ejercicio, vi: com.mathphysics.app.data.model.ValoresInicialesSimulacion, resultado: RespuestaResultado?, onResponder: (Map<String, Any>, Int) -> Unit, onSiguiente: () -> Unit) {
    val voltaje = numDe(vi.fijos, "voltaje")
    val corrienteObjetivo = vi.objetivo?.get("corriente") ?: 0.0
    val opciones = vi.opciones ?: emptyList()
    var resistencia by remember(ejercicio.id) { mutableStateOf(opciones.firstOrNull() ?: 47.0) }
    val corriente = if (resistencia > 0) voltaje / resistencia else 0.0

    MarcoSimulacion(
        ejercicio = ejercicio, resultado = resultado, valorActual = resistencia,
        onResponder = onResponder, onSiguiente = onSiguiente,
        diagrama = {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Canvas(modifier = Modifier.fillMaxWidth().height(170.dp)) {
                    val w = size.width; val h = size.height
                    dibujarCuadriculaProtoboard()
                    val top = h * 0.25f; val bottom = h * 0.75f; val left = w * 0.2f; val right = w * 0.85f
                    drawRoundRect(
                        color = trazo(),
                        topLeft = Offset(left, top),
                        size = androidx.compose.ui.geometry.Size(right - left, bottom - top),
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(14f, 14f),
                        style = androidx.compose.ui.graphics.drawscope.Stroke(width = 4.dp.toPx()),
                    )
                    dibujarBateria(Offset(left, (top + bottom) / 2), vertical = true)
                    dibujarResistencia(Offset(w * 0.4f, top), Offset(w * 0.75f, top), resistencia)
                    dibujarTextoCentrado("${formatearNumero(voltaje)} V", left - 22.dp.toPx(), (top + bottom) / 2 + 5.dp.toPx(), ancladoIzquierda = true)
                    dibujarTextoCentrado("${formatearNumero(resistencia)} Ω", (w * 0.4f + w * 0.75f) / 2, top - 22.dp.toPx())
                }
                LecturaObjetivo("Corriente actual", "%.3f A".format(corriente), "Objetivo: %.3f A".format(corrienteObjetivo), aciertaObjetivo(corriente, corrienteObjetivo))
            }
        },
        control = { ControlDiscreto("RESISTENCIA", resistencia, "Ω", opciones, resultado == null) { resistencia = it } },
    )
}

// ============================================================================
// 2. Segunda Ley de Newton — bloque empujado por una fuerza
// ============================================================================
@Composable
private fun NewtonSimulacion(ejercicio: Ejercicio, vi: com.mathphysics.app.data.model.ValoresInicialesSimulacion, resultado: RespuestaResultado?, onResponder: (Map<String, Any>, Int) -> Unit, onSiguiente: () -> Unit) {
    val masa = numDe(vi.fijos, "masa")
    val aceleracionObjetivo = vi.objetivo?.get("aceleracion") ?: 0.0
    val rango = vi.rango
    var fuerza by remember(ejercicio.id) { mutableStateOf(rango?.min ?: 1.0) }
    val aceleracion = if (masa > 0) fuerza / masa else 0.0

    MarcoSimulacion(
        ejercicio = ejercicio, resultado = resultado, valorActual = fuerza,
        onResponder = onResponder, onSiguiente = onSiguiente,
        diagrama = {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Canvas(modifier = Modifier.fillMaxWidth().height(160.dp)) {
                    val w = size.width; val h = size.height
                    val suelo = h * 0.78f
                    dibujarLinea(Offset(w * 0.1f, suelo), Offset(w * 0.9f, suelo))
                    val bloqueIzq = w * 0.5f; val bloqueAncho = w * 0.22f; val bloqueAlto = h * 0.32f
                    drawRect(color = TealDark, topLeft = Offset(bloqueIzq, suelo - bloqueAlto), size = androidx.compose.ui.geometry.Size(bloqueAncho, bloqueAlto))
                    dibujarTextoCentradoEn("${formatearNumero(masa)} kg", bloqueIzq + bloqueAncho / 2, suelo - bloqueAlto / 2, blanco = true)
                    val flechaFin = bloqueIzq - 10
                    val flechaInicio = (flechaFin - (w * 0.28f)).coerceAtLeast(w * 0.08f)
                    dibujarFlecha(Offset(flechaInicio, suelo - bloqueAlto / 2), Offset(flechaFin, suelo - bloqueAlto / 2))
                    dibujarTextoCentrado("${formatearNumero(fuerza)} N", (flechaInicio + flechaFin) / 2, suelo - bloqueAlto - 14.dp.toPx())
                }
                LecturaObjetivo("Aceleración actual", "%.3f m/s²".format(aceleracion), "Objetivo: %.3f m/s²".format(aceleracionObjetivo), aciertaObjetivo(aceleracion, aceleracionObjetivo))
            }
        },
        control = { rango?.let { ControlContinuo("FUERZA", fuerza, "N", it.min, it.max, it.paso, resultado == null) { v -> fuerza = v } } },
    )
}

// ============================================================================
// 3. Energía potencial — objeto a cierta altura
// ============================================================================
@Composable
private fun EnergiaSimulacion(ejercicio: Ejercicio, vi: com.mathphysics.app.data.model.ValoresInicialesSimulacion, resultado: RespuestaResultado?, onResponder: (Map<String, Any>, Int) -> Unit, onSiguiente: () -> Unit) {
    val masa = numDe(vi.fijos, "masa")
    val g = numDe(vi.fijos, "g").let { if (it > 0) it else 9.8 }
    val energiaObjetivo = vi.objetivo?.get("energia") ?: 0.0
    val rango = vi.rango
    var altura by remember(ejercicio.id) { mutableStateOf(rango?.min ?: 1.0) }
    val energia = masa * g * altura

    MarcoSimulacion(
        ejercicio = ejercicio, resultado = resultado, valorActual = altura,
        onResponder = onResponder, onSiguiente = onSiguiente,
        diagrama = {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Canvas(modifier = Modifier.fillMaxWidth().height(160.dp)) {
                    val w = size.width; val h = size.height
                    val suelo = h * 0.85f; val techo = h * 0.1f
                    dibujarLinea(Offset(w * 0.15f, suelo), Offset(w * 0.85f, suelo))
                    val alturaMax = rango?.max ?: 50.0
                    val fraccion = (altura / alturaMax).coerceIn(0.05, 1.0)
                    val yObjeto = suelo - (suelo - techo) * fraccion.toFloat()
                    dibujarLineaPunteada(Offset(w * 0.3f, suelo), Offset(w * 0.3f, yObjeto))
                    drawCircle(color = Amber, radius = 10.dp.toPx(), center = Offset(w * 0.3f, yObjeto))
                    drawCircle(color = trazo(), radius = 10.dp.toPx(), center = Offset(w * 0.3f, yObjeto), style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2.dp.toPx()))
                    dibujarTextoCentrado("${formatearNumero(altura)} m", w * 0.3f + 44.dp.toPx(), (suelo + yObjeto) / 2)
                    dibujarTextoCentrado("${formatearNumero(masa)} kg", w * 0.3f, yObjeto - 18.dp.toPx())
                }
                LecturaObjetivo("Energía potencial actual", "%.1f J".format(energia), "Objetivo: %.1f J".format(energiaObjetivo), aciertaObjetivo(energia, energiaObjetivo))
            }
        },
        control = { rango?.let { ControlContinuo("ALTURA", altura, "m", it.min, it.max, it.paso, resultado == null) { v -> altura = v } } },
    )
}

// ============================================================================
// 4. Teorema de Pitágoras — triángulo rectángulo
// ============================================================================
@Composable
private fun PitagorasSimulacion(ejercicio: Ejercicio, vi: com.mathphysics.app.data.model.ValoresInicialesSimulacion, resultado: RespuestaResultado?, onResponder: (Map<String, Any>, Int) -> Unit, onSiguiente: () -> Unit) {
    val catetoA = numDe(vi.fijos, "cateto_a")
    val hipotenusaObjetivo = vi.objetivo?.get("hipotenusa") ?: 0.0
    val rango = vi.rango
    var catetoB by remember(ejercicio.id) { mutableStateOf(rango?.min ?: 1.0) }
    val hipotenusa = kotlin.math.sqrt(catetoA * catetoA + catetoB * catetoB)

    MarcoSimulacion(
        ejercicio = ejercicio, resultado = resultado, valorActual = catetoB,
        onResponder = onResponder, onSiguiente = onSiguiente,
        diagrama = {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Canvas(modifier = Modifier.fillMaxWidth().height(160.dp)) {
                    val w = size.width; val h = size.height
                    val base = Offset(w * 0.2f, h * 0.8f)
                    val esquina = Offset(w * 0.2f, h * 0.2f)
                    val punta = Offset(w * 0.75f, h * 0.8f)
                    dibujarLinea(esquina, base)
                    dibujarLinea(base, punta)
                    dibujarLinea(punta, esquina)
                    dibujarTextoCentrado("${formatearNumero(catetoA)} cm", esquina.x - 34.dp.toPx(), (esquina.y + base.y) / 2)
                    dibujarTextoCentrado("${formatearNumero(catetoB)} cm", (base.x + punta.x) / 2, base.y + 22.dp.toPx())
                    dibujarTextoCentrado("? cm", (esquina.x + punta.x) / 2 + 10, (esquina.y + punta.y) / 2 - 12.dp.toPx())
                }
                LecturaObjetivo("Hipotenusa actual", "%.2f cm".format(hipotenusa), "Objetivo: %.2f cm".format(hipotenusaObjetivo), aciertaObjetivo(hipotenusa, hipotenusaObjetivo))
            }
        },
        control = { rango?.let { ControlContinuo("SEGUNDO CATETO", catetoB, "cm", it.min, it.max, it.paso, resultado == null) { v -> catetoB = v } } },
    )
}

// ============================================================================
// 5. Voltaje en serie — baterías conectadas una tras otra
// ============================================================================
@Composable
private fun VoltajeSerieSimulacion(ejercicio: Ejercicio, vi: com.mathphysics.app.data.model.ValoresInicialesSimulacion, resultado: RespuestaResultado?, onResponder: (Map<String, Any>, Int) -> Unit, onSiguiente: () -> Unit) {
    val fijas = listaDe(vi.fijos, "baterias")
    val objetivoTotal = vi.objetivo?.get("voltaje_total") ?: 0.0
    val opciones = vi.opciones ?: emptyList()
    var ultima by remember(ejercicio.id) { mutableStateOf(opciones.firstOrNull() ?: 1.5) }
    val total = fijas.sum() + ultima

    MarcoSimulacion(
        ejercicio = ejercicio, resultado = resultado, valorActual = ultima,
        onResponder = onResponder, onSiguiente = onSiguiente,
        diagrama = {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Canvas(modifier = Modifier.fillMaxWidth().height(140.dp)) {
                    dibujarCuadriculaProtoboard()
                    val todas = fijas + ultima
                    val n = todas.size
                    val espacio = size.width / (n + 1)
                    val salida = BATERIA_LARGO_DP.dp.toPx() / 2 + BATERIA_TERMINAL_DP.dp.toPx() // hasta la punta del terminal +
                    val entrada = BATERIA_LARGO_DP.dp.toPx() / 2 + 3.dp.toPx()                  // hasta la placa plana −
                    todas.forEachIndexed { i, v ->
                        val x = espacio * (i + 1)
                        dibujarBateria(Offset(x, size.height * 0.42f), vertical = false)
                        dibujarTextoCentrado("${formatearNumero(v)} V", x, size.height * 0.85f)
                        if (i < n - 1) dibujarLinea(Offset(x + salida, size.height * 0.42f), Offset(x + espacio - entrada, size.height * 0.42f))
                    }
                }
                LecturaObjetivo("Voltaje total actual", "%.1f V".format(total), "Objetivo: %.1f V".format(objetivoTotal), aciertaObjetivo(total, objetivoTotal))
            }
        },
        control = { ControlDiscreto("ÚLTIMA BATERÍA", ultima, "V", opciones, resultado == null) { ultima = it } },
    )
}

// ============================================================================
// 6. Resistencias en serie
// ============================================================================
@Composable
private fun ResistenciasSerieSimulacion(ejercicio: Ejercicio, vi: com.mathphysics.app.data.model.ValoresInicialesSimulacion, resultado: RespuestaResultado?, onResponder: (Map<String, Any>, Int) -> Unit, onSiguiente: () -> Unit) {
    val fijas = listaDe(vi.fijos, "resistencias")
    val objetivoTotal = vi.objetivo?.get("resistencia_total") ?: 0.0
    val opciones = vi.opciones ?: emptyList()
    var ultima by remember(ejercicio.id) { mutableStateOf(opciones.firstOrNull() ?: 10.0) }
    val total = fijas.sum() + ultima

    MarcoSimulacion(
        ejercicio = ejercicio, resultado = resultado, valorActual = ultima,
        onResponder = onResponder, onSiguiente = onSiguiente,
        diagrama = {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Canvas(modifier = Modifier.fillMaxWidth().height(140.dp)) {
                    dibujarCuadriculaProtoboard()
                    val todas = fijas + ultima
                    val n = todas.size
                    val espacio = size.width / (n + 1)
                    val pata = 34.dp.toPx() // todas las resistencias miden lo mismo; solo cambian sus bandas
                    todas.forEachIndexed { i, v ->
                        val x = espacio * (i + 1)
                        dibujarResistencia(Offset(x - pata, size.height * 0.42f), Offset(x + pata, size.height * 0.42f), v)
                        dibujarTextoCentrado("${formatearNumero(v)} Ω", x, size.height * 0.85f)
                        if (i < n - 1) dibujarLinea(Offset(x + pata, size.height * 0.42f), Offset(x + espacio - pata, size.height * 0.42f))
                    }
                }
                LecturaObjetivo("Resistencia total actual", "%.0f Ω".format(total), "Objetivo: %.0f Ω".format(objetivoTotal), aciertaObjetivo(total, objetivoTotal))
            }
        },
        control = { ControlDiscreto("ÚLTIMA RESISTENCIA", ultima, "Ω", opciones, resultado == null) { ultima = it } },
    )
}

// ---------------------------------------------------------------------------
// Lectura en vivo del resultado vs. el objetivo — verde cuando está cerca.
// ---------------------------------------------------------------------------
private fun aciertaObjetivo(actual: Double, objetivo: Double): Boolean = kotlin.math.abs(actual - objetivo) < 0.5

@Composable
private fun LecturaObjetivo(etiqueta: String, valorActual: String, objetivo: String, cerca: Boolean) {
    Spacer(Modifier.height(10.dp))
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = if (cerca) TealLight else Superficie,
        border = BorderStroke(if (cerca) 2.dp else 1.dp, if (cerca) acento() else TextoSecundario.copy(alpha = 0.5f)),
    ) {
        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(etiqueta, style = MaterialTheme.typography.bodyMedium, color = TextoSecundario)
            Text(valorActual, style = MaterialTheme.typography.titleMedium, color = if (cerca) acento() else TextoPrimario, fontWeight = FontWeight.Bold)
            Text(objetivo, style = MaterialTheme.typography.bodyMedium, color = colorObjetivo(), fontWeight = FontWeight.Bold)
        }
    }
}

// ---------------------------------------------------------------------------
// Primitivas de dibujo reutilizadas entre los 6 diagramas. Todo en dp para que
// se vea igual de nítido en cualquier densidad de pantalla, y con colores que
// salen del tema (trazo(), TealDark…) para tener contraste en claro y oscuro.
// ---------------------------------------------------------------------------
private const val BATERIA_LARGO_DP = 40f
private const val BATERIA_ANCHO_DP = 26f
private const val BATERIA_TERMINAL_DP = 6f

private fun DrawScope.dibujarLinea(a: Offset, b: Offset) {
    drawLine(color = trazo(), start = a, end = b, strokeWidth = 3.dp.toPx(), cap = StrokeCap.Round)
}

private fun DrawScope.dibujarLineaPunteada(a: Offset, b: Offset) {
    drawLine(
        color = TextoSecundario, start = a, end = b, strokeWidth = 2.dp.toPx(),
        pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 8f)),
    )
}

private fun DrawScope.dibujarFlecha(inicio: Offset, fin: Offset) {
    val color = if (AppTheme.modoOscuro) Amber else Color(0xFFC77700)
    val grosor = 4.dp.toPx()
    drawLine(color = color, start = inicio, end = fin, strokeWidth = grosor, cap = StrokeCap.Round)
    val angulo = Math.atan2((fin.y - inicio.y).toDouble(), (fin.x - inicio.x).toDouble())
    val largoPunta = 14.dp.toPx()
    val p1 = Offset(fin.x - largoPunta * kotlin.math.cos(angulo - 0.45).toFloat(), fin.y - largoPunta * kotlin.math.sin(angulo - 0.45).toFloat())
    val p2 = Offset(fin.x - largoPunta * kotlin.math.cos(angulo + 0.45).toFloat(), fin.y - largoPunta * kotlin.math.sin(angulo + 0.45).toFloat())
    val path = Path().apply { moveTo(fin.x, fin.y); lineTo(p1.x, p1.y); moveTo(fin.x, fin.y); lineTo(p2.x, p2.y) }
    drawPath(path, color = color, style = androidx.compose.ui.graphics.drawscope.Stroke(width = grosor, cap = StrokeCap.Round))
}

// Fondo tipo protoboard — una cuadrícula tenue de puntos, como Tinkercad.
private fun DrawScope.dibujarCuadriculaProtoboard() {
    val espacio = 16.dp.toPx()
    val radio = 1.1.dp.toPx()
    val color = TextoSecundario.copy(alpha = 0.3f)
    var y = espacio
    while (y < size.height) {
        var x = espacio
        while (x < size.width) {
            drawCircle(color = color, radius = radio, center = Offset(x, y))
            x += espacio
        }
        y += espacio
    }
}

// Pila tipo AA con relieve: cuerpo con degradado, franja ámbar, terminal
// positivo dorado y placa negativa plana, signos +/−, y sombra. Se dibuja
// horizontal (+ a la derecha) y, para el circuito de Ohm, se gira 90° (+ arriba).
private fun DrawScope.dibujarBateria(centro: Offset, vertical: Boolean) {
    rotate(degrees = if (vertical) -90f else 0f, pivot = centro) {
        val largo = BATERIA_LARGO_DP.dp.toPx()
        val ancho = BATERIA_ANCHO_DP.dp.toPx()
        val terminal = BATERIA_TERMINAL_DP.dp.toPx()
        val radio = 6.dp.toPx()
        val izq = centro.x - largo / 2
        val arriba = centro.y - ancho / 2
        val tam = androidx.compose.ui.geometry.Size(largo, ancho)
        val esquina = androidx.compose.ui.geometry.CornerRadius(radio, radio)

        // sombra
        drawRoundRect(color = Color.Black.copy(alpha = 0.22f), topLeft = Offset(izq, arriba + 2.dp.toPx()), size = tam, cornerRadius = esquina)

        // placa negativa (extremo izquierdo, plano)
        drawRoundRect(
            brush = Brush.verticalGradient(listOf(Color(0xFFB8BCC4), Color(0xFF6E727A), Color(0xFFB8BCC4)), startY = arriba, endY = arriba + ancho),
            topLeft = Offset(izq - 3.dp.toPx(), centro.y - ancho * 0.3f),
            size = androidx.compose.ui.geometry.Size(5.dp.toPx(), ancho * 0.6f),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(2.dp.toPx(), 2.dp.toPx()),
        )

        // terminal positivo (extremo derecho, dorado)
        drawRoundRect(
            brush = Brush.verticalGradient(listOf(Color(0xFFF2D675), Color(0xFFB8901E), Color(0xFFF2D675)), startY = arriba, endY = arriba + ancho),
            topLeft = Offset(izq + largo - 2.dp.toPx(), centro.y - ancho * 0.22f),
            size = androidx.compose.ui.geometry.Size(terminal + 2.dp.toPx(), ancho * 0.44f),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(2.5.dp.toPx(), 2.5.dp.toPx()),
        )

        // cuerpo con degradado vertical (efecto cilíndrico)
        drawRoundRect(
            brush = Brush.verticalGradient(
                listOf(Color(0xFF6B7080), Color(0xFF2B2E38), Color(0xFF1C1E26), Color(0xFF3A3E4A)),
                startY = arriba, endY = arriba + ancho,
            ),
            topLeft = Offset(izq, arriba), size = tam, cornerRadius = esquina,
        )

        // franja ámbar del lado positivo
        drawRect(
            color = Color(0xFFF3B940),
            topLeft = Offset(izq + largo * 0.58f, arriba + 2.dp.toPx()),
            size = androidx.compose.ui.geometry.Size(largo * 0.14f, ancho - 4.dp.toPx()),
        )

        // brillo superior
        drawRoundRect(
            color = Color.White.copy(alpha = 0.28f),
            topLeft = Offset(izq + 4.dp.toPx(), arriba + 2.dp.toPx()),
            size = androidx.compose.ui.geometry.Size(largo - 8.dp.toPx(), 3.dp.toPx()),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(1.5.dp.toPx(), 1.5.dp.toPx()),
        )

        // signos: + (derecha) y − (izquierda)
        val signo = 2.dp.toPx()
        val mitad = 4.dp.toPx()
        val xMas = izq + largo * 0.86f - 2.dp.toPx()
        drawLine(Color.White, Offset(xMas - mitad, centro.y), Offset(xMas + mitad, centro.y), strokeWidth = signo, cap = StrokeCap.Round)
        drawLine(Color.White, Offset(xMas, centro.y - mitad), Offset(xMas, centro.y + mitad), strokeWidth = signo, cap = StrokeCap.Round)
        val xMenos = izq + largo * 0.2f
        drawLine(Color.White, Offset(xMenos - mitad, centro.y), Offset(xMenos + mitad, centro.y), strokeWidth = signo, cap = StrokeCap.Round)
    }
}

// Código de colores real de resistencias (2 cifras significativas +
// multiplicador) — igual que en un componente físico o en Tinkercad, no
// decorativo: cada valor E12 se reconstruye exacto a partir de sus bandas.
private val COLOR_BANDA = mapOf(
    0 to Color(0xFF1B1C2C), 1 to Color(0xFF8B5A2B), 2 to Color(0xFFE53935),
    3 to Color(0xFFFF7B00), 4 to Color(0xFFFFD600), 5 to Color(0xFF2E7D32),
    6 to Color(0xFF1565C0), 7 to Color(0xFF8E24AA), 8 to Color(0xFF757575),
    9 to Color(0xFFFFFFFF),
)

private fun digitosBandas(valorOhms: Double): Triple<Int, Int, Int> {
    var v = valorOhms.roundToInt()
    var mult = 0
    while (v >= 100) { v /= 10; mult++ }
    return Triple(v / 10, v % 10, mult)
}

// TAMAÑO FIJO: todas las resistencias miden igual (50 × 20 dp) sin importar el
// valor ni cuánto espacio haya entre sus extremos; `a` y `b` solo indican hasta
// dónde llegan las patas. Lo único que cambia entre una y otra son las bandas.
private fun DrawScope.dibujarResistencia(a: Offset, b: Offset, valorOhms: Double) {
    val centro = Offset((a.x + b.x) / 2, (a.y + b.y) / 2)
    val anchoCuerpo = 50.dp.toPx()
    val altoCuerpo = 20.dp.toPx()
    val izq = centro.x - anchoCuerpo / 2
    val arriba = centro.y - altoCuerpo / 2

    // patas metálicas
    val pata = Color(0xFF9AA0A6)
    val grosorPata = 2.5.dp.toPx()
    drawLine(pata, a, Offset(izq + 4.dp.toPx(), centro.y), strokeWidth = grosorPata, cap = StrokeCap.Round)
    drawLine(pata, Offset(izq + anchoCuerpo - 4.dp.toPx(), centro.y), b, strokeWidth = grosorPata, cap = StrokeCap.Round)

    // sombra + cuerpo color hueso con degradado (relieve cilíndrico) y borde fino
    val esquina = androidx.compose.ui.geometry.CornerRadius(altoCuerpo / 2.2f, altoCuerpo / 2.2f)
    val tam = androidx.compose.ui.geometry.Size(anchoCuerpo, altoCuerpo)
    drawRoundRect(color = Color.Black.copy(alpha = 0.2f), topLeft = Offset(izq, arriba + 2.dp.toPx()), size = tam, cornerRadius = esquina)
    drawRoundRect(
        brush = Brush.verticalGradient(listOf(Color(0xFFF6E7BF), Color(0xFFE0C98F), Color(0xFFBFA56A)), startY = arriba, endY = arriba + altoCuerpo),
        topLeft = Offset(izq, arriba), size = tam, cornerRadius = esquina,
    )
    drawRoundRect(
        color = Color(0xFF7A6A3A), topLeft = Offset(izq, arriba), size = tam, cornerRadius = esquina,
        style = androidx.compose.ui.graphics.drawscope.Stroke(width = 1.dp.toPx()),
    )

    // 3 bandas reales (dos cifras + multiplicador)
    val (d1, d2, mult) = digitosBandas(valorOhms)
    val colores = listOf(COLOR_BANDA[d1]!!, COLOR_BANDA[d2]!!, COLOR_BANDA[mult] ?: Color(0xFF1B1C2C))
    val anchoBanda = anchoCuerpo * 0.1f
    val espacioBandas = anchoCuerpo * 0.17f
    val inicioX = izq + anchoCuerpo * 0.24f
    colores.forEachIndexed { i, c ->
        drawRect(
            color = c,
            topLeft = Offset(inicioX + i * espacioBandas, arriba + 1.dp.toPx()),
            size = androidx.compose.ui.geometry.Size(anchoBanda, altoCuerpo - 2.dp.toPx()),
        )
    }
    // brillo
    drawRoundRect(
        color = Color.White.copy(alpha = 0.3f),
        topLeft = Offset(izq + 5.dp.toPx(), arriba + 2.dp.toPx()),
        size = androidx.compose.ui.geometry.Size(anchoCuerpo - 10.dp.toPx(), 2.dp.toPx()),
        cornerRadius = androidx.compose.ui.geometry.CornerRadius(1.dp.toPx(), 1.dp.toPx()),
    )
}

// Texto del diagrama: más grande (15 sp), en negrita y con el color del tema.
private fun DrawScope.dibujarTextoCentrado(texto: String, x: Float, y: Float, ancladoIzquierda: Boolean = false) {
    drawContext.canvas.nativeCanvas.drawText(
        texto, x, y,
        android.graphics.Paint().apply {
            color = trazo().toArgb()
            textSize = 15.sp.toPx()
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            textAlign = if (ancladoIzquierda) android.graphics.Paint.Align.RIGHT else android.graphics.Paint.Align.CENTER
            isAntiAlias = true
        },
    )
}

private fun DrawScope.dibujarTextoCentradoEn(texto: String, x: Float, y: Float, blanco: Boolean = false) {
    drawContext.canvas.nativeCanvas.drawText(
        texto, x, y,
        android.graphics.Paint().apply {
            color = if (blanco) android.graphics.Color.WHITE else trazo().toArgb()
            textSize = 14.sp.toPx()
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            textAlign = android.graphics.Paint.Align.CENTER
            isAntiAlias = true
        },
    )
}

package com.mathphysics.app.data.remote

import com.mathphysics.app.data.local.SessionManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {

    // ⚠️ EDITA ESTA LÍNEA cada vez que reinicies el túnel de ngrok — el link
    // gratuito de ngrok CAMBIA cada vez que corres "ngrok http 3000" de nuevo
    // (a menos que pagues por un dominio fijo). Cópialo de la terminal donde
    // corriste ngrok (línea "Forwarding", la que empieza con https://...ngrok-free.app)
    //
    // Ejemplo: "https://a1b2-201-123-45-67.ngrok-free.app/"
    //
    // Alternativas si NO estás usando ngrok:
    // - Emulador de Android Studio: "http://10.0.2.2:3000/"
    // - Celular físico por WiFi (misma red que la PC): "http://TU_IP_LOCAL:3000/"
    const val BASE_URL = "https://judiciary-caress-duly.ngrok-free.dev/"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    // ngrok (plan gratis) muestra una página de aviso en vez de la respuesta
    // real la primera vez que detecta tráfico "de navegador" — este header le
    // dice que somos la app, no un navegador, y la evita siempre. Sin esto,
    // la app recibiría HTML en vez de JSON y todas las llamadas fallarían.
    private val ngrokBypassInterceptor = okhttp3.Interceptor { chain ->
        val requestConNgrokHeader = chain.request().newBuilder()
            .addHeader("ngrok-skip-browser-warning", "true")
            .build()
        chain.proceed(requestConNgrokHeader)
    }

    // Adjunta el JWT guardado (si hay uno) a TODAS las peticiones; el backend
    // ya exige sesión válida en todas las rutas salvo login y registro.
    private val authInterceptor = okhttp3.Interceptor { chain ->
        val token = SessionManager.token
        val request = if (token != null) {
            chain.request().newBuilder().addHeader("Authorization", "Bearer $token").build()
        } else {
            chain.request()
        }
        chain.proceed(request)
    }

    // Si el servidor responde 401 a una petición que SÍ llevaba token, la
    // sesión ya no es válida (expiró por inactividad de admin, o se invalidó):
    // se limpia la sesión local y se avisa al NavGraph para volver al Login.
    // Se ignoran login/registro (ahí un 401 solo significa "credenciales
    // incorrectas") y logout.
    private val sesionExpiradaInterceptor = okhttp3.Interceptor { chain ->
        val request = chain.request()
        val response = chain.proceed(request)
        val ruta = request.url.encodedPath
        val esAuth = ruta.endsWith("/auth/login") || ruta.endsWith("/auth/registro") || ruta.endsWith("/auth/logout")
        if (response.code == 401 && !esAuth && request.header("Authorization") != null) {
            SessionManager.marcarExpirada()
        }
        response
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(ngrokBypassInterceptor)
        .addInterceptor(authInterceptor)
        .addInterceptor(sesionExpiradaInterceptor)
        .addInterceptor(loggingInterceptor)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS) // subir imágenes de contenido (hasta 3 x 2 MB) por ngrok
        .build()

    val apiService: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}

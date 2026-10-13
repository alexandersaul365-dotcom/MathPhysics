-- Simulaciones nuevas (RQF13): tercera ley de Newton, energía cinética,
-- transformación de energía y velocidad y aceleración.
-- Ejecutar en phpMyAdmin sobre `mathphysics` (se puede re-ejecutar sin problema).
ALTER TABLE ejercicio_simulacion
  MODIFY tipo_simulacion ENUM('ley_ohm','segunda_ley_newton','energia_potencial','pitagoras',
                              'voltaje_serie','resistencias_serie',
                              'tercera_ley_newton','energia_cinetica','transformacion_energia','velocidad_aceleracion') NOT NULL;

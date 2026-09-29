-- Guardas de "una sola vez" para los bonos de RQNF30 (+50 subtema, +150 tema)
-- y para poder re-evaluar insignias/bonos de forma segura sobre historial
-- que ya existía antes de que esta lógica se escribiera (ver backfill_insignias.js).
USE mathphysics;

CREATE TABLE IF NOT EXISTS subtema_completado (
  usuario_id BIGINT UNSIGNED NOT NULL,
  subtema_id INT UNSIGNED NOT NULL,
  completado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, subtema_id),
  CONSTRAINT fk_subtemacompletado_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_subtemacompletado_subtema FOREIGN KEY (subtema_id) REFERENCES subtemas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tema_completado (
  usuario_id BIGINT UNSIGNED NOT NULL,
  tema_id INT UNSIGNED NOT NULL,
  completado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, tema_id),
  CONSTRAINT fk_temacompletado_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_temacompletado_tema FOREIGN KEY (tema_id) REFERENCES temas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

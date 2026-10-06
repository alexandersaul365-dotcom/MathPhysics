-- Panel de administrador (RQNF44): los ejercicios también registran la fecha
-- de publicación. Ejecutar UNA vez en phpMyAdmin sobre la base `mathphysics`.
ALTER TABLE ejercicios ADD COLUMN fecha_publicacion DATETIME NULL AFTER estado;

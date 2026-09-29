// Script de un solo uso: recorre TODOS los usuarios y TODOS los subtemas/temas
// que ya están completos (según las teóricas, no el pool de ejercicios
// generados) y que todavía no tienen fila en subtema_completado/tema_completado,
// y les otorga retroactivamente el bono de XP (+50/+150, RQNF30) y evalúa las
// insignias correspondientes (velocista, maestro_tema, primera_respuesta,
// explorador) como si esa respuesta se hubiera contestado hoy.
//
// Es necesario correrlo UNA VEZ después de desplegar la corrección de
// preguntaTeoricaController.js, porque el auto-reparo de ese controlador solo
// se dispara la PRÓXIMA VEZ que el usuario vuelve a acertar algo en ese mismo
// subtema — y no todos los usuarios van a "revisitar" un subtema que ya
// completaron antes.
//
// Uso:
//   node src/migrations/backfill_insignias.js
//
// Es idempotente: se puede correr varias veces sin riesgo (usa los mismos
// INSERT IGNORE + affectedRows que el controlador real), así que si se corre
// dos veces por accidente no se duplica ningún XP ni insignia.

require('dotenv').config();
const pool = require('../config/db');
const {
  totalTeoricasPublicadas,
  contarTeoricasCorrectasSubtema,
  temaCompleto,
} = require('../utils/progreso');
const {
  evaluarPrimeraRespuesta,
  evaluarExplorador,
  evaluarMaestroTema,
  evaluarVelocista,
} = require('../utils/insignias');

const XP_BONO_SUBTEMA = 50;
const XP_BONO_TEMA = 150;

async function otorgarXp(usuarioId, concepto, cantidad) {
  await pool.query(
    'INSERT INTO xp_usuario (usuario_id, total) VALUES (?, 0) ON DUPLICATE KEY UPDATE usuario_id = usuario_id',
    [usuarioId]
  );
  await pool.query('UPDATE xp_usuario SET total = total + ? WHERE usuario_id = ?', [cantidad, usuarioId]);
  await pool.query('INSERT INTO historial_xp (usuario_id, concepto, xp_cantidad) VALUES (?, ?, ?)', [
    usuarioId,
    concepto,
    cantidad,
  ]);
}

async function backfillUsuario(usuarioId, resumen) {
  const insigniasDesbloqueadas = [];

  const [subtemas] = await pool.query('SELECT id, tema_id FROM subtemas ORDER BY id');

  for (const s of subtemas) {
    const total = await totalTeoricasPublicadas(pool, s.id);
    if (total === 0) continue;

    const correctas = await contarTeoricasCorrectasSubtema(pool, usuarioId, s.id);
    const subtemaCompleto = correctas === total;
    if (!subtemaCompleto) continue;

    const [resultadoSubtema] = await pool.query(
      'INSERT IGNORE INTO subtema_completado (usuario_id, subtema_id) VALUES (?, ?)',
      [usuarioId, s.id]
    );
    if (resultadoSubtema.affectedRows > 0) {
      await otorgarXp(usuarioId, 'Subtema completado (retroactivo)', XP_BONO_SUBTEMA);
      resumen.subtemasBackfilled.push(s.id);
    }

    await evaluarVelocista(pool, usuarioId, s.id, insigniasDesbloqueadas);

    if (s.tema_id) {
      const temaYaCompleto = await temaCompleto(pool, usuarioId, s.tema_id);
      if (temaYaCompleto) {
        const [resultadoTema] = await pool.query(
          'INSERT IGNORE INTO tema_completado (usuario_id, tema_id) VALUES (?, ?)',
          [usuarioId, s.tema_id]
        );
        if (resultadoTema.affectedRows > 0) {
          await otorgarXp(usuarioId, 'Tema completado (retroactivo)', XP_BONO_TEMA);
          resumen.temasBackfilled.push(s.tema_id);
        }
        await evaluarMaestroTema(pool, usuarioId, s.tema_id, insigniasDesbloqueadas);
      }
    }
  }

  // Insignias que no dependen de un subtema/tema específico — es seguro
  // re-evaluarlas aquí también, ya que son idempotentes (INSERT IGNORE).
  await evaluarPrimeraRespuesta(pool, usuarioId, insigniasDesbloqueadas);
  await evaluarExplorador(pool, usuarioId, insigniasDesbloqueadas);

  resumen.insigniasDesbloqueadas.push(...insigniasDesbloqueadas.map((codigo) => ({ usuarioId, codigo })));
}

async function main() {
  const [usuarios] = await pool.query('SELECT id, nombre_usuario FROM usuarios ORDER BY id');

  console.log(`Backfill de insignias/bonos — ${usuarios.length} usuario(s) encontrados.\n`);

  for (const u of usuarios) {
    const resumen = { subtemasBackfilled: [], temasBackfilled: [], insigniasDesbloqueadas: [] };
    await backfillUsuario(u.id, resumen);

    const huboAlgo =
      resumen.subtemasBackfilled.length > 0 ||
      resumen.temasBackfilled.length > 0 ||
      resumen.insigniasDesbloqueadas.length > 0;

    if (huboAlgo) {
      console.log(`Usuario #${u.id} (${u.nombre_usuario}):`);
      if (resumen.subtemasBackfilled.length > 0) {
        console.log(`  + Bono de subtema (${XP_BONO_SUBTEMA} XP) para subtema(s): ${resumen.subtemasBackfilled.join(', ')}`);
      }
      if (resumen.temasBackfilled.length > 0) {
        console.log(`  + Bono de tema (${XP_BONO_TEMA} XP) para tema(s): ${resumen.temasBackfilled.join(', ')}`);
      }
      for (const { codigo } of resumen.insigniasDesbloqueadas) {
        console.log(`  + Insignia desbloqueada: ${codigo}`);
      }
    } else {
      console.log(`Usuario #${u.id} (${u.nombre_usuario}): sin pendientes.`);
    }
  }

  console.log('\nBackfill completado.');
  await pool.end();
}

main().catch((err) => {
  console.error('Error en el backfill:', err);
  process.exit(1);
});

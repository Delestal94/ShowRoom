-- Dos problemas encadenados que salieron al probar el rollup.
--
-- 1. analytics_events.project_id era ON DELETE SET NULL: al borrar un
--    proyecto sus eventos quedaban huérfanos en vez de irse con él. Un evento
--    sin proyecto no se puede atribuir a nada y sólo ocupa lugar.
--
-- 2. En un índice único cada NULL cuenta como distinto, así que esas filas
--    huérfanas nunca hacían conflicto y el rollup las duplicaba en cada
--    corrida — un trabajo pensado para ser idempotente que crecía sin fin.

DELETE FROM analytics_events WHERE project_id IS NULL;

ALTER TABLE analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_project_id_projects_id_fk;

ALTER TABLE analytics_events
  ADD CONSTRAINT analytics_events_project_id_projects_id_fk
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Defensa adicional: aunque ya no deberían existir NULLs, el índice los
-- trata como un valor concreto para que el rollup siga siendo idempotente.
DROP INDEX IF EXISTS analytics_daily_unique_idx;
CREATE UNIQUE INDEX analytics_daily_unique_idx ON analytics_daily (
  tenant_id,
  coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
  day,
  event_type,
  coalesce(unit_id, '')
);

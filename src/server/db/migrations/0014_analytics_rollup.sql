-- Agregados diarios de analytics.
--
-- analytics_events crece sin techo: un proyecto con tráfico real genera del
-- orden de un millón de filas por mes. El dashboard sólo necesita totales por
-- día, así que se agregan y se descarta el detalle viejo.
--
-- Sin esto la tabla termina dominando la base y el dashboard se degrada solo.

CREATE TABLE IF NOT EXISTS analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  day date NOT NULL,
  event_type varchar(50) NOT NULL,
  unit_id text,
  events integer NOT NULL DEFAULT 0,
  sessions integer NOT NULL DEFAULT 0,
  dwell_ms bigint NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);

-- Una fila por combinación: el rollup es idempotente y se puede re-correr.
CREATE UNIQUE INDEX IF NOT EXISTS analytics_daily_unique_idx
  ON analytics_daily (tenant_id, project_id, day, event_type, coalesce(unit_id, ''));

CREATE INDEX IF NOT EXISTS analytics_daily_lookup_idx
  ON analytics_daily (tenant_id, project_id, day DESC);

ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_daily_select ON analytics_daily;
CREATE POLICY analytics_daily_select ON analytics_daily FOR SELECT
  USING (tenant_id::text = current_setting('app.tenant_id', true));

GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_daily TO showroom_app;

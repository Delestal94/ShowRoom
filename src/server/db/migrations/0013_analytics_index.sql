-- El dashboard de analytics filtra siempre por tenant + proyecto + fecha, y
-- sólo existía índice por tenant_id. Con pocos miles de filas no se nota;
-- con millones, cada consulta recorre todos los eventos del tenant.
--
-- created_at va DESC porque las consultas piden siempre los últimos N días.
CREATE INDEX IF NOT EXISTS analytics_events_tenant_project_date_idx
  ON analytics_events (tenant_id, project_id, created_at DESC);

-- Los avances y leads se listan por proyecto ordenados por fecha.
CREATE INDEX IF NOT EXISTS leads_tenant_created_idx
  ON leads (tenant_id, created_at DESC);

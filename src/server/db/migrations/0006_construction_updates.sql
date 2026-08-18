-- Avances de obra, con sus políticas RLS desde el arranque.

CREATE TABLE IF NOT EXISTS construction_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  progress_percent integer,
  images_json jsonb DEFAULT '[]'::jsonb,
  published_at timestamp,
  notified_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS construction_updates_project_id_idx
  ON construction_updates (project_id);
CREATE INDEX IF NOT EXISTS construction_updates_tenant_id_idx
  ON construction_updates (tenant_id);

ALTER TABLE construction_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_updates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS construction_updates_select ON construction_updates;
DROP POLICY IF EXISTS construction_updates_write ON construction_updates;

-- Público sólo cuando el avance está publicado Y el proyecto también:
-- un avance publicado dentro de un proyecto en borrador no debe filtrarse.
CREATE POLICY construction_updates_select ON construction_updates FOR SELECT
  USING (
    tenant_id::text = current_setting('app.tenant_id', true) OR
    (
      published_at IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = construction_updates.project_id
          AND p.status = 'published'
      )
    )
  );

CREATE POLICY construction_updates_write ON construction_updates FOR ALL
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

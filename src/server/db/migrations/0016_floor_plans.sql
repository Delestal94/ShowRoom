-- Módulo plano-3d: convertir un plano 2D en un modelo 3D publicable.
--
-- model_json guarda el estado editable completo (muros, aberturas, escala).
-- El editor siempre carga y opera sobre la planta entera, nunca sobre un
-- subconjunto — normalizar en tablas de muros/aberturas costaría un join por
-- render y varias escrituras por trazo a cambio de consultas que nadie hace.

CREATE TABLE IF NOT EXISTS floor_plans (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id          uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  building_id         uuid REFERENCES buildings(id) ON DELETE SET NULL,
  tour_id             uuid REFERENCES tours(id) ON DELETE SET NULL,
  name                text NOT NULL,
  level               integer,
  source_storage_key  text,
  source_cdn_url      text,
  source_kind         varchar(20) NOT NULL DEFAULT 'image',
  px_per_meter        numeric(12, 4),
  model_json          jsonb DEFAULT '{}',
  status              varchar(20) NOT NULL DEFAULT 'draft',
  created_at          timestamp NOT NULL DEFAULT now(),
  updated_at          timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS floor_plans_project_id_idx ON floor_plans (project_id);
CREATE INDEX IF NOT EXISTS floor_plans_tenant_id_idx ON floor_plans (tenant_id);

ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_plans FORCE ROW LEVEL SECURITY;

-- Sin rama pública: a diferencia de tours, el plano de origen y el modelo
-- editable nunca son de lectura pública, esté el proyecto publicado o no.
-- Lo único que el storefront ve es el tour GLB ya publicado (tours_select),
-- que ya tiene su propia política.
CREATE POLICY floor_plans_select ON floor_plans FOR SELECT
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY floor_plans_insert ON floor_plans FOR INSERT
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY floor_plans_update ON floor_plans FOR UPDATE
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY floor_plans_delete ON floor_plans FOR DELETE
  USING (tenant_id::text = current_setting('app.tenant_id', true));

GRANT SELECT, INSERT, UPDATE, DELETE ON floor_plans TO showroom_app;

-- Edificios y terminaciones: las tablas ya existían en el schema pero sin
-- uso, sin permisos para el rol de la app y sin políticas RLS.

-- ---------- buildings ----------
-- El nombre identifica la torre dentro del proyecto ("Torre A"), así que no
-- puede repetirse: la agrupación de unidades sería ambigua.
CREATE UNIQUE INDEX IF NOT EXISTS buildings_project_name_idx
  ON buildings (project_id, name);

ALTER TABLE buildings ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- ---------- finish_options ----------
ALTER TABLE finish_options ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE finish_options ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE finish_options ADD COLUMN IF NOT EXISTS storage_key text;

ALTER TABLE finish_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE finish_options FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON buildings TO showroom_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON finish_options TO showroom_app;

-- El código de unidad la identifica en su URL pública
-- (/[projectSlug]/unidad/[code]), así que debe ser único dentro del proyecto.
CREATE UNIQUE INDEX IF NOT EXISTS units_project_code_idx ON units (project_id, code);

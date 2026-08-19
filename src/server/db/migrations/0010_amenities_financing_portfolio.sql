-- Tres secciones que Urbania lista en su web y nos faltaban.
--
-- amenities_json ya existía en projects sin ningún uso; se suman
-- financing_json (opciones de financiación) y portfolio_json a nivel tenant
-- (proyectos ya entregados, para generar confianza).

ALTER TABLE projects ADD COLUMN IF NOT EXISTS financing_json jsonb DEFAULT '[]'::jsonb;
ALTER TABLE tenants  ADD COLUMN IF NOT EXISTS portfolio_json jsonb DEFAULT '[]'::jsonb;

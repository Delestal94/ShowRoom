-- Puntos de interés cercanos, mostrados junto al mapa en la página pública.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS points_of_interest_json jsonb DEFAULT '[]'::jsonb;

-- Contadores para limitar abuso en endpoints públicos (formulario de leads,
-- ingesta de analytics, generación de PDF).
--
-- Va en la base y no en memoria: en serverless cada invocación puede ser una
-- instancia nueva, así que un contador en memoria no limita nada.
--
-- La clave guarda un hash del IP, no el IP: alcanza para contar y evita
-- almacenar un dato personal que no necesitamos.

CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON rate_limits (window_start);

GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limits TO showroom_app;

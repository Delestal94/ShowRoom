-- Links de broker con tracking.
--
-- El schema original ataba cada link a un `membership`, es decir, exigía que
-- el broker tuviera cuenta en la app. En la práctica se le pasa un link a un
-- martillero externo que nunca se va a registrar, así que el nombre va en el
-- propio link y la membresía queda opcional para cuando sí exista.

ALTER TABLE broker_links ADD COLUMN IF NOT EXISTS broker_name text;
ALTER TABLE broker_links ADD COLUMN IF NOT EXISTS clicks integer NOT NULL DEFAULT 0;
ALTER TABLE broker_links ALTER COLUMN url DROP NOT NULL;

-- La atribución apunta al link, no a la membresía: el link puede no tener
-- usuario detrás, y es lo que efectivamente se compartió.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS broker_link_id uuid
  REFERENCES broker_links(id) ON DELETE SET NULL;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS broker_link_id uuid
  REFERENCES broker_links(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS leads_broker_link_id_idx ON leads (broker_link_id);
CREATE INDEX IF NOT EXISTS analytics_events_broker_link_id_idx
  ON analytics_events (broker_link_id);

-- El código se resuelve públicamente (alguien entra con ?ref=CODIGO), así que
-- la política de lectura no puede exigir contexto de tenant.
ALTER TABLE broker_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_links FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS broker_links_select ON broker_links;
DROP POLICY IF EXISTS broker_links_write ON broker_links;
DROP POLICY IF EXISTS broker_links_update_public ON broker_links;

CREATE POLICY broker_links_select ON broker_links FOR SELECT
  USING (
    tenant_id::text = current_setting('app.tenant_id', true) OR
    -- Resolver un código es como resolver un slug: quien tiene el link ya
    -- lo conoce. Los datos sensibles (leads atribuidos) siguen protegidos
    -- por la política de `leads`.
    tracking_code IS NOT NULL
  );

CREATE POLICY broker_links_write ON broker_links FOR ALL
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- El contador de clics se incrementa desde la visita pública, sin sesión.
CREATE POLICY broker_links_update_public ON broker_links FOR UPDATE
  USING (true)
  WITH CHECK (true);

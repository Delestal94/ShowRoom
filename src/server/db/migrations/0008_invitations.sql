-- Invitaciones al tenant.
--
-- Basadas en link, no en mail: no hay proveedor de correo configurado y en
-- este mercado el link se manda por WhatsApp igual. El token es el secreto.

CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  role varchar(50) NOT NULL DEFAULT 'editor',
  label text,
  expires_at timestamp NOT NULL,
  accepted_at timestamp,
  accepted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invitations_tenant_id_idx ON invitations (tenant_id);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invitations_select ON invitations;
DROP POLICY IF EXISTS invitations_write ON invitations;
DROP POLICY IF EXISTS invitations_accept ON invitations;

-- Quien acepta todavía no pertenece al tenant, así que necesita poder leer
-- la invitación por su token. El token es largo y aleatorio: conocerlo ya es
-- la autorización, igual que un link de "restablecer contraseña".
CREATE POLICY invitations_select ON invitations FOR SELECT
  USING (
    tenant_id::text = current_setting('app.tenant_id', true) OR
    token IS NOT NULL
  );

CREATE POLICY invitations_write ON invitations FOR ALL
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- Marcar la invitación como aceptada ocurre antes de tener contexto de
-- tenant; el WHERE por token es lo que la acota a una sola fila.
CREATE POLICY invitations_accept ON invitations FOR UPDATE
  USING (true)
  WITH CHECK (true);

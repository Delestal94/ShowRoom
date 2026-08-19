-- Row Level Security para ShowRoom
--
-- Contexto importante sobre por qué esto está escrito así:
--
-- El rol dueño de las tablas (neondb_owner) tiene BYPASSRLS, y Neon no
-- permite quitárselo. Por eso RLS NO protege nada si la app se conecta con
-- ese rol — las políticas existirían pero se ignorarían en silencio.
--
-- La app runtime se conecta con el rol `showroom_app`, que no es dueño de
-- las tablas ni tiene BYPASSRLS. FORCE ROW LEVEL SECURITY se aplica igual
-- por si en el futuro el rol pasa a ser dueño de alguna tabla.
--
-- Variables de sesión que la app setea por transacción (ver
-- src/server/db/tenant-db.ts):
--   app.tenant_id  → tenant activo del usuario logueado
--   app.user_id    → users.id, necesario para resolver el tenant al iniciar
--                    sesión, cuando todavía no se sabe cuál es el tenant

-- ============ Habilitar RLS ============

ALTER TABLE tenants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships       ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE units             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours             ENABLE ROW LEVEL SECURITY;
ALTER TABLE finish_options    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities   ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_links      ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events  ENABLE ROW LEVEL SECURITY;

ALTER TABLE tenants           FORCE ROW LEVEL SECURITY;
ALTER TABLE subscriptions     FORCE ROW LEVEL SECURITY;
ALTER TABLE memberships       FORCE ROW LEVEL SECURITY;
ALTER TABLE projects          FORCE ROW LEVEL SECURITY;
ALTER TABLE buildings         FORCE ROW LEVEL SECURITY;
ALTER TABLE units             FORCE ROW LEVEL SECURITY;
ALTER TABLE tours             FORCE ROW LEVEL SECURITY;
ALTER TABLE finish_options    FORCE ROW LEVEL SECURITY;
ALTER TABLE leads             FORCE ROW LEVEL SECURITY;
ALTER TABLE lead_activities   FORCE ROW LEVEL SECURITY;
ALTER TABLE broker_links      FORCE ROW LEVEL SECURITY;
ALTER TABLE analytics_events  FORCE ROW LEVEL SECURITY;

-- ============ Tenants ============

-- La segunda rama es la que hace posible el login: al arrancar la sesión
-- todavía no hay app.tenant_id (es lo que se está resolviendo), y la
-- consulta de membership hace JOIN contra esta tabla. Sin esto, el JOIN
-- devuelve cero filas y ningún usuario puede volver a entrar.
CREATE POLICY tenants_select ON tenants FOR SELECT
  USING (
    id::text = current_setting('app.tenant_id', true) OR
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.tenant_id = tenants.id
        AND m.user_id::text = current_setting('app.user_id', true)
    ) OR
    -- El storefront necesita el nombre y el WhatsApp de la desarrolladora
    -- para mostrarlos en la página del proyecto, y corre sin sesión. Una
    -- desarrolladora con un proyecto publicado ya es públicamente
    -- identificable: su página es pública. Sin esta rama el botón de
    -- WhatsApp queda invisible en todo el sitio público.
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.tenant_id = tenants.id AND p.status = 'published'
    )
  );

-- El alta de tenant ocurre en el primer login, antes de que exista
-- app.tenant_id. Crear la fila no filtra datos de nadie; lo que protege
-- el aislamiento es la política de SELECT de arriba.
CREATE POLICY tenants_insert ON tenants FOR INSERT
  WITH CHECK (true);

CREATE POLICY tenants_update ON tenants FOR UPDATE
  USING (id::text = current_setting('app.tenant_id', true));

-- ============ Memberships ============
-- Se lee por user_id durante el bootstrap de sesión, cuando todavía no
-- se conoce el tenant — de ahí la rama por app.user_id.

CREATE POLICY memberships_select ON memberships FOR SELECT
  USING (
    user_id::text   = current_setting('app.user_id', true) OR
    tenant_id::text = current_setting('app.tenant_id', true)
  );

CREATE POLICY memberships_insert ON memberships FOR INSERT
  WITH CHECK (user_id::text = current_setting('app.user_id', true));

CREATE POLICY memberships_update ON memberships FOR UPDATE
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY memberships_delete ON memberships FOR DELETE
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- ============ Subscriptions ============

CREATE POLICY subscriptions_select ON subscriptions FOR SELECT
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY subscriptions_insert ON subscriptions FOR INSERT
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- El webhook de Stripe llega sin sesión de usuario y actualiza por
-- stripe_subscription_id, que es un identificador que sólo conoce Stripe.
CREATE POLICY subscriptions_update ON subscriptions FOR UPDATE
  USING (true);

-- ============ Projects ============
-- Un proyecto publicado es público por diseño: el storefront lo resuelve
-- por slug, sin sesión ni tenant. Eso no es una concesión, es el requisito.

CREATE POLICY projects_select ON projects FOR SELECT
  USING (
    tenant_id::text = current_setting('app.tenant_id', true) OR
    status = 'published'
  );

CREATE POLICY projects_insert ON projects FOR INSERT
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY projects_update ON projects FOR UPDATE
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY projects_delete ON projects FOR DELETE
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- ============ Units ============

CREATE POLICY units_select ON units FOR SELECT
  USING (
    tenant_id::text = current_setting('app.tenant_id', true) OR
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = units.project_id AND p.status = 'published'
    )
  );

CREATE POLICY units_insert ON units FOR INSERT
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY units_update ON units FOR UPDATE
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY units_delete ON units FOR DELETE
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- ============ Tours ============

CREATE POLICY tours_select ON tours FOR SELECT
  USING (
    tenant_id::text = current_setting('app.tenant_id', true) OR
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tours.project_id AND p.status = 'published'
    )
  );

CREATE POLICY tours_insert ON tours FOR INSERT
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tours_update ON tours FOR UPDATE
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tours_delete ON tours FOR DELETE
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- ============ Buildings ============

CREATE POLICY buildings_select ON buildings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = buildings.project_id
        AND (
          p.tenant_id::text = current_setting('app.tenant_id', true) OR
          p.status = 'published'
        )
    )
  );

CREATE POLICY buildings_write ON buildings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = buildings.project_id
        AND p.tenant_id::text = current_setting('app.tenant_id', true)
    )
  );

-- ============ Finish options ============

CREATE POLICY finish_options_select ON finish_options FOR SELECT
  USING (
    tenant_id::text = current_setting('app.tenant_id', true) OR
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = finish_options.project_id AND p.status = 'published'
    )
  );

CREATE POLICY finish_options_write ON finish_options FOR ALL
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- ============ Leads ============
-- El formulario de contacto es público y anónimo: cualquiera puede crear
-- un lead. Leerlos, en cambio, queda restringido al tenant dueño.

CREATE POLICY leads_insert ON leads FOR INSERT
  WITH CHECK (true);

CREATE POLICY leads_select ON leads FOR SELECT
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY leads_update ON leads FOR UPDATE
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY leads_delete ON leads FOR DELETE
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- ============ Lead activities ============

CREATE POLICY lead_activities_select ON lead_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lead_activities.lead_id
        AND l.tenant_id::text = current_setting('app.tenant_id', true)
    )
  );

CREATE POLICY lead_activities_insert ON lead_activities FOR INSERT
  WITH CHECK (true);

-- ============ Broker links ============

CREATE POLICY broker_links_select ON broker_links FOR SELECT
  USING (
    tenant_id::text = current_setting('app.tenant_id', true) OR
    tracking_code IS NOT NULL
  );

CREATE POLICY broker_links_write ON broker_links FOR ALL
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- ============ Analytics events ============
-- La ingesta viene del visor público, sin sesión.

CREATE POLICY analytics_events_insert ON analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY analytics_events_select ON analytics_events FOR SELECT
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- ============ users / plans ============
-- No son tenant-scoped. `users` se consulta por auth_user_id (que viene de
-- la sesión de Supabase) y `plans` es un catálogo público de precios.

-- ============ Invitations ============
-- Quien acepta una invitación todavía no pertenece al tenant, así que
-- necesita leer la fila por su token.
--
-- Ojo con el patrón: `token IS NOT NULL` parece equivalente pero es SIEMPRE
-- verdadero — dejaría a cualquier tenant listar las invitaciones de todos,
-- tokens incluidos, y usarlas para meterse en otro tenant. La app declara el
-- token que está consultando en app.invite_token y la política expone
-- únicamente esa fila.

CREATE POLICY invitations_select ON invitations FOR SELECT
  USING (
    tenant_id::text = current_setting('app.tenant_id', true) OR
    token = current_setting('app.invite_token', true)
  );

CREATE POLICY invitations_write ON invitations FOR ALL
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY invitations_accept ON invitations FOR UPDATE
  USING (token = current_setting('app.invite_token', true))
  WITH CHECK (token = current_setting('app.invite_token', true));

-- ============ Users ============
-- Se lee en el bootstrap de sesión, antes de conocer el tenant. La app
-- declara en app.auth_user_id el id de Supabase de quien está autenticado y
-- la política expone únicamente esa fila.
--
-- Sin esto la tabla quedaba sin RLS y cualquier consulta que la alcanzara
-- podía listar los emails de todos los usuarios de la plataforma.

CREATE POLICY users_select ON users FOR SELECT
  USING (auth_user_id = current_setting('app.auth_user_id', true));

CREATE POLICY users_insert ON users FOR INSERT
  WITH CHECK (auth_user_id = current_setting('app.auth_user_id', true));

CREATE POLICY users_update ON users FOR UPDATE
  USING (auth_user_id = current_setting('app.auth_user_id', true));

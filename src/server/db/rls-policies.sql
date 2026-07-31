-- Row Level Security Policies for ShowRoom
-- This ensures data is isolated between tenants at the database level

-- ============ Setup ============

-- Create app role (used by the application)
-- Note: The actual connection user should already exist from Neon
-- This is just for reference

-- ALTER ROLE application_user NOINHERIT;

-- ============ Enable RLS on all tenant-scoped tables ============

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE finish_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- ============ Tenants table ============

-- Tenants can only see their own tenant record
-- Super admins can see all tenants
CREATE POLICY tenants_select ON tenants FOR SELECT
  USING (
    (SELECT current_setting('app.tenant_id', true) = id::text) OR
    (SELECT current_setting('app.global_role', true) = 'super_admin')
  );

CREATE POLICY tenants_update ON tenants FOR UPDATE
  USING (
    (SELECT current_setting('app.global_role', true) = 'super_admin')
  );

-- ============ Subscriptions table ============

CREATE POLICY subscriptions_select ON subscriptions FOR SELECT
  USING (
    tenant_id::text = current_setting('app.tenant_id', true) OR
    (SELECT current_setting('app.global_role', true) = 'super_admin')
  );

CREATE POLICY subscriptions_insert ON subscriptions FOR INSERT
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

CREATE POLICY subscriptions_update ON subscriptions FOR UPDATE
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

-- ============ Memberships table ============

CREATE POLICY memberships_select ON memberships FOR SELECT
  USING (
    tenant_id::text = current_setting('app.tenant_id', true) OR
    (SELECT current_setting('app.global_role', true) = 'super_admin')
  );

CREATE POLICY memberships_insert ON memberships FOR INSERT
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

CREATE POLICY memberships_update ON memberships FOR UPDATE
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

CREATE POLICY memberships_delete ON memberships FOR DELETE
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

-- ============ Projects table ============

CREATE POLICY projects_select ON projects FOR SELECT
  USING (
    tenant_id::text = current_setting('app.tenant_id', true) OR
    (SELECT current_setting('app.global_role', true) = 'super_admin')
  );

CREATE POLICY projects_insert ON projects FOR INSERT
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

CREATE POLICY projects_update ON projects FOR UPDATE
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

CREATE POLICY projects_delete ON projects FOR DELETE
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

-- ============ Buildings table ============

CREATE POLICY buildings_select ON buildings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = buildings.project_id
      AND projects.tenant_id::text = current_setting('app.tenant_id', true)
    ) OR
    (SELECT current_setting('app.global_role', true) = 'super_admin')
  );

CREATE POLICY buildings_insert ON buildings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = buildings.project_id
      AND projects.tenant_id::text = current_setting('app.tenant_id', true)
    )
  );

CREATE POLICY buildings_update ON buildings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = buildings.project_id
      AND projects.tenant_id::text = current_setting('app.tenant_id', true)
    )
  );

-- ============ Units table ============

CREATE POLICY units_select ON units FOR SELECT
  USING (
    tenant_id::text = current_setting('app.tenant_id', true) OR
    (SELECT current_setting('app.global_role', true) = 'super_admin')
  );

CREATE POLICY units_insert ON units FOR INSERT
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

CREATE POLICY units_update ON units FOR UPDATE
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

CREATE POLICY units_delete ON units FOR DELETE
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

-- ============ Tours table ============

CREATE POLICY tours_select ON tours FOR SELECT
  USING (
    tenant_id::text = current_setting('app.tenant_id', true) OR
    (SELECT current_setting('app.global_role', true) = 'super_admin')
  );

CREATE POLICY tours_insert ON tours FOR INSERT
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

CREATE POLICY tours_update ON tours FOR UPDATE
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

CREATE POLICY tours_delete ON tours FOR DELETE
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

-- ============ Finish Options table ============

CREATE POLICY finish_options_select ON finish_options FOR SELECT
  USING (
    tenant_id::text = current_setting('app.tenant_id', true) OR
    (SELECT current_setting('app.global_role', true) = 'super_admin')
  );

CREATE POLICY finish_options_insert ON finish_options FOR INSERT
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

CREATE POLICY finish_options_update ON finish_options FOR UPDATE
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

-- ============ Leads table ============

CREATE POLICY leads_select ON leads FOR SELECT
  USING (
    tenant_id::text = current_setting('app.tenant_id', true) OR
    (SELECT current_setting('app.global_role', true) = 'super_admin')
  );

CREATE POLICY leads_insert ON leads FOR INSERT
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

CREATE POLICY leads_update ON leads FOR UPDATE
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

CREATE POLICY leads_delete ON leads FOR DELETE
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

-- ============ Lead Activities table ============

CREATE POLICY lead_activities_select ON lead_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_activities.lead_id
      AND leads.tenant_id::text = current_setting('app.tenant_id', true)
    ) OR
    (SELECT current_setting('app.global_role', true) = 'super_admin')
  );

CREATE POLICY lead_activities_insert ON lead_activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_activities.lead_id
      AND leads.tenant_id::text = current_setting('app.tenant_id', true)
    )
  );

-- ============ Broker Links table ============

CREATE POLICY broker_links_select ON broker_links FOR SELECT
  USING (
    tenant_id::text = current_setting('app.tenant_id', true) OR
    (SELECT current_setting('app.global_role', true) = 'super_admin')
  );

CREATE POLICY broker_links_insert ON broker_links FOR INSERT
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

CREATE POLICY broker_links_update ON broker_links FOR UPDATE
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

-- ============ Analytics Events table ============

CREATE POLICY analytics_events_select ON analytics_events FOR SELECT
  USING (
    tenant_id::text = current_setting('app.tenant_id', true) OR
    (SELECT current_setting('app.global_role', true) = 'super_admin')
  );

CREATE POLICY analytics_events_insert ON analytics_events FOR INSERT
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
  );

-- ============ Users table (no RLS, global table) ============

-- Users table is not tenant-scoped, so no RLS needed

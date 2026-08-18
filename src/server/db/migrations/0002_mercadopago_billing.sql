-- Migración de Stripe a Mercado Pago.
-- Stripe no opera en Argentina (46 países soportados, Argentina no está),
-- así que el cobro se hace con la API de suscripciones de Mercado Pago
-- (preapproval_plan + preapproval).

-- ---------- plans ----------
ALTER TABLE plans DROP COLUMN IF EXISTS stripe_price_id;

ALTER TABLE plans ADD COLUMN IF NOT EXISTS slug varchar(30);
ALTER TABLE plans ADD COLUMN IF NOT EXISTS project_limit integer NOT NULL DEFAULT 1;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_monthly numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS currency varchar(3) NOT NULL DEFAULT 'ARS';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS mp_preapproval_plan_id text;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- features_json pasa de objeto a lista de strings (bullets del plan).
ALTER TABLE plans ALTER COLUMN features_json SET DEFAULT '[]'::jsonb;

UPDATE plans SET slug = lower(name) WHERE slug IS NULL;
ALTER TABLE plans ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS plans_slug_idx ON plans (slug);

-- ---------- subscriptions ----------
ALTER TABLE subscriptions DROP COLUMN IF EXISTS stripe_subscription_id;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS mp_preapproval_id text;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_mp_preapproval_id_idx
  ON subscriptions (mp_preapproval_id);

-- El default pasa de 'active' a 'pending': una suscripción recién creada en
-- Mercado Pago todavía no está autorizada hasta que el pagador la aprueba.
ALTER TABLE subscriptions ALTER COLUMN status SET DEFAULT 'pending';

-- Un tenant tiene una sola suscripción vigente.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_tenant_unique_idx
  ON subscriptions (tenant_id);

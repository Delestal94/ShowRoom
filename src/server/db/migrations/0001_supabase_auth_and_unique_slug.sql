-- Applied manually against the production DB while migrating off Clerk.
-- Recorded here so a fresh clone ends up with the same schema.

-- users.clerk_user_id → users.auth_user_id (now stores Supabase auth.users.id)
alter table users rename column clerk_user_id to auth_user_id;

-- projects.slug must be globally unique: the public storefront resolves
-- /[projectSlug] by slug alone, with no tenant in the URL. Two tenants
-- sharing a slug would make one project's page render the other's data.
drop index if exists projects_slug_idx;
create unique index projects_slug_idx on projects (slug);

# ShowRoom — 3D Real Estate Platform (Urbania Clone)

A professional SaaS platform for real estate developers to showcase projects with interactive 3D tours, built with Next.js, TypeScript, and modern cloud infrastructure.

## Phase 0: Foundational Setup

This is the initial scaffold for the ShowRoom platform. The following components are ready:

### ✅ Completed

- **Next.js App Router** (TypeScript, Tailwind CSS)
- **Database Schema** (Drizzle ORM, 12+ tenant-scoped tables)
- **Row Level Security** (Postgres RLS policies for multi-tenant isolation)
- **Clerk Integration** (Auth + Organizations)
- **Stripe Webhooks** (Subscription management)
- **Tenant Resolution** (Middleware + context)
- **Project Structure** (Modular architecture for 1-dev maintainability)

### ⚙️ Setup Instructions

#### 1. Install Dependencies

```bash
pnpm install
```

#### 2. Configure Environment

Copy `.env.local` and fill in your secrets:

```bash
# Clerk (https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
CLERK_SECRET_KEY=your_secret

# Neon Postgres (https://console.neon.tech)
DATABASE_URL=postgresql://user:password@host/dbname

# Stripe (https://dashboard.stripe.com)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_key
STRIPE_SECRET_KEY=your_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Cloudflare R2 (https://dash.cloudflare.com)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=showroom-assets
NEXT_PUBLIC_R2_CDN_URL=https://your-cdn-url

# Inngest (optional for Phase 1+)
INNGEST_EVENT_KEY=your_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### 3. Initialize Database

```bash
# Run migrations with Drizzle Kit
pnpm exec drizzle-kit generate:pg
pnpm exec drizzle-kit migrate
```

#### 4. Apply RLS Policies

```bash
# Connect to your Neon database and run:
psql $DATABASE_URL < src/server/db/rls-policies.sql
```

#### 5. Create Initial Plans

```bash
# Use your database client to insert:
INSERT INTO plans (id, name, unit_limit, stripe_price_id) VALUES
  ('plan-pro', 'Pro', 100, 'price_pro'),
  ('plan-lite', 'Lite', 20, 'price_lite'),
  ('plan-solo', 'Solo', 5, NULL);
```

#### 6. Start Dev Server

```bash
pnpm dev
```

Open http://localhost:3000 in your browser.

### 🧪 Testing Phase 0

#### Create Tenant

```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Developer", "slug": "test-dev", "planId": "plan-lite"}'
```

#### Verify Multi-Tenant Isolation

1. Access via tenant subdomain: `http://test-dev.localhost:3000` (requires DNS setup)
2. Create two tenants and verify RLS blocks cross-tenant data access
3. Check Postgres logs to confirm RLS policies are enforced

### 📁 Project Structure

```
src/
  app/               # Next.js routes (public, admin, platform surfaces)
  modules/           # Domain logic (tenancy, auth, projects, leads, etc.)
  components/        # UI components (viewer3d, viewer360, ui)
  server/
    db/              # Drizzle schema, RLS policies, client
  lib/               # Utilities
```

### 🔐 Security Highlights

- **Row Level Security**: Postgres RLS policies block cross-tenant data access at the database level
- **Scoped DB Client**: All queries must go through the tenant-scoped client (no ad-hoc queries)
- **Middleware Tenant Resolution**: Tenant is extracted from subdomain and validated before each request
- **No BYPASSRLS**: Application role cannot bypass RLS; super-admin uses separate role

### 📊 Upcoming (Phase 1-5)

- Phase 1: 3D Viewer (react-three-fiber + Pannellum) + CMS
- Phase 2: Unit Buscador + Comparador + PDF Fichas
- Phase 3: CRM/Leads + Broker Segregation
- Phase 4: Analytics + Heatmaps
- Phase 5: Multi-Tenant Hardening + Super-Admin Panel

### 📚 References

- [Architecture Plan](../../plans/wiggly-percolating-marble.md)
- [Clerk Documentation](https://clerk.com/docs)
- [Drizzle ORM](https://orm.drizzle.team)
- [Postgres RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Stripe Billing](https://stripe.com/docs/billing)

### 🚀 Deployment

This project is configured for Vercel:

```bash
# Deploy to Vercel
vercel deploy
```

Vercel automatically:
- Builds Next.js optimized bundle
- Connects to Neon Postgres
- Manages environment secrets
- Provides Edge Config for tenant resolution caching

### 💬 Notes

- This is a greenfield project with no existing code to preserve
- Architecture prioritizes single-dev maintainability over feature richness
- All external services are managed (no self-hosted infrastructure)
- Multi-tenancy uses row-level + RLS, not schema-per-tenant (simpler for 1 dev)

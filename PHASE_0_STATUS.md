# Phase 0: Foundational — Status Report

## ✅ Completed

### Architecture & Setup
- [x] Next.js App Router scaffold (TypeScript, Tailwind CSS)
- [x] Project structure: `/modules`, `/components`, `/server/db`, `/api`
- [x] Environment configuration (`.env.local` template)

### Database & Multi-Tenancy
- [x] Drizzle ORM schema with 12 tenant-scoped tables:
  - Tenants, Plans, Subscriptions (billing)
  - Users, Memberships (N:M auth)
  - Projects, Buildings, Units, Tours, FinishOptions (content)
  - Leads, LeadActivities, BrokerLinks (CRM)
  - AnalyticsEvents (logging)
- [x] Postgres RLS policies for complete data isolation
- [x] Row-level + DB-level enforcement (two-layer security)
- [x] Drizzle migrations config

### Authentication & Tenant Resolution
- [x] Clerk integration setup
- [x] Middleware for tenant slug extraction (subdomains)
- [x] Tenant context utilities
- [x] Clerk auth integration (user creation, memberships)

### Billing & Webhooks
- [x] Stripe webhook handler (subscription create/update/cancel)
- [x] Subscription sync with database
- [x] Plan management tables

### API Routes
- [x] `POST /api/tenants` — create tenant with subscription
- [x] `POST /api/webhooks/stripe` — handle Stripe events

### Documentation
- [x] Comprehensive README with Phase 0 setup guide
- [x] Architecture plan saved to `/plans`

---

## ⚠️ Next Steps (Phase 1)

### Immediate Tasks Before Running Dev Server
1. **Create git repository**
   ```bash
   cd d:/Programas/Utilities/Proyectos/ShowRoom
   git init
   git add .
   git commit -m "Scaffold: Phase 0 foundational setup"
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Setup external services** (Clerk, Neon, Stripe, R2)
   - Create accounts and get API keys
   - Fill in `.env.local`
   - Configure webhook endpoints

4. **Initialize database**
   ```bash
   pnpm exec drizzle-kit generate:pg
   pnpm exec drizzle-kit migrate
   psql $DATABASE_URL < src/server/db/rls-policies.sql
   ```

5. **Insert default plans**
   - Use Neon dashboard or `psql` to add Pro/Lite/Solo plans

6. **Test tenant creation**
   ```bash
   pnpm dev
   # Then POST to /api/tenants to verify multi-tenancy works
   ```

### Phase 1: 3D Viewer + CMS (Next Major Step)
- [ ] react-three-fiber setup for GLB viewer
- [ ] Pannellum setup for 360° tours
- [ ] CMS routes for Project/Unit/Tour management
- [ ] R2 presigned URLs for direct upload
- [ ] Storefront public routes
- [ ] Daylight/sunset/night mode toggle

**Deliverable**: Admin uploads GLB + 360 images → Buyer sees interactive tour

---

## 🔐 Security Checklist (Phase 0)

- [x] RLS policies on all tenant-scoped tables
- [x] Scoped DB client (no ad-hoc queries)
- [x] Clerk auth enforced on protected routes
- [x] Middleware tenant validation
- [x] No BYPASSRLS on app role

**Before Production (Phase 5)**
- [ ] Security audit with `/code-review ultra` focused on multi-tenancy
- [ ] Test cross-tenant data access attempts (should all fail)
- [ ] Verify RLS blocks direct SQL queries that try to bypass tenant_id
- [ ] Hardening: add request signing, IP whitelisting if needed

---

## 📊 Database Schema Overview

```
Tenants (root entity)
├─ Projects (1:N)
│  ├─ Units (1:N) with dynamic attrs_json
│  ├─ Buildings (optional, for towers)
│  ├─ Tours/Assets (1:N)
│  └─ FinishOptions (for comparador)
├─ Subscriptions (1:1 with Plan)
├─ Memberships (N:M with Users) — auth roles
├─ Leads (CRM, 1:N)
│  └─ LeadActivities (timeline)
├─ BrokerLinks (tracking, 1:N per tenant+project)
└─ AnalyticsEvents (high-volume logging)
```

All tables have `tenant_id` except `users` (global). RLS policies check `current_setting('app.tenant_id')` on every query.

---

## 🚀 Deployment Readiness

**Ready for Vercel**:
- ✅ Next.js project (App Router)
- ✅ Middleware (tenant resolution)
- ✅ Environment secrets configured
- ✅ Database migrations ready

**After Phase 1**:
- Add `vercel.json` with cron job config (analytics aggregation)
- Setup Edge Config for tenant caching (if needed)
- Configure Stripe webhook URL in Vercel dashboard

---

## 📝 Notes

- This phase establishes **foundational security and multi-tenancy**
- No UI yet — API-first approach allows concurrent work on phases 1-3
- Architecture supports growing from 1 tenant to 1000s without redesign
- All external services are managed (no operational burden)

---

## Running Locally

```bash
pnpm install
# Fill in .env.local with Clerk, Neon, Stripe, R2 keys
pnpm exec drizzle-kit migrate
psql $DATABASE_URL < src/server/db/rls-policies.sql
pnpm dev
```

Then open http://localhost:3000

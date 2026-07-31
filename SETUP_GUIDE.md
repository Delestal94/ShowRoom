# ShowRoom Setup Guide — Phase 0

This guide walks you through finishing Phase 0 setup (foundational infrastructure) for the ShowRoom platform.

## ✅ What's Already Done

- [x] Next.js project scaffold (TypeScript, Tailwind CSS)
- [x] Drizzle ORM schema (14 tables)
- [x] Database migrations generated
- [x] All dependencies installed
- [x] TypeScript compilation successful
- [x] Project builds without errors

## 🚀 Quick Start (Development)

### 1. Configure Environment

Fill in `.env.local` with your actual credentials:

```bash
# Get these from: https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Get this from: https://console.neon.tech
DATABASE_URL=postgresql://user:password@ep-123.us-east-2.neon.tech/showroom

# Get these from: https://dashboard.stripe.com/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# For Phase 1+: https://dash.cloudflare.com
R2_ACCOUNT_ID=abc123
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=showroom-assets
NEXT_PUBLIC_R2_CDN_URL=https://cdn.yourdomain.com

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Setup Database (Neon)

After getting your `DATABASE_URL`:

```bash
# Run migrations
pnpm exec drizzle-kit migrate

# Apply RLS policies
psql $DATABASE_URL < src/server/db/rls-policies.sql

# Insert default plans
psql $DATABASE_URL -c "
INSERT INTO plans (id, name, unit_limit, stripe_price_id) VALUES
  ('plan-pro-v1', 'Pro', 100, 'price_xxx'),
  ('plan-lite-v1', 'Lite', 20, 'price_yyy'),
  ('plan-solo-v1', 'Solo', 5, NULL);
"
```

### 3. Start Dev Server

```bash
pnpm dev
```

Then open http://localhost:3000

## 🧪 Testing Phase 0

### Test 1: Create a Tenant via API

```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Real Estate",
    "slug": "acme-dev",
    "planId": "plan-lite-v1"
  }'
```

Expected response:
```json
{
  "tenant": {
    "id": "uuid-...",
    "name": "Acme Real Estate",
    "slug": "acme-dev",
    "status": "active"
  },
  "message": "Tenant created successfully"
}
```

### Test 2: Verify Multi-Tenant Isolation

1. Create two tenants:
   - `acme-dev` (tenant_id = UUID-1)
   - `widgets-co` (tenant_id = UUID-2)

2. In Neon dashboard, run this query as tenant 1:
   ```sql
   -- This should SUCCEED (your own tenant)
   SELECT * FROM projects WHERE tenant_id = 'UUID-1';

   -- This should FAIL with RLS error (cross-tenant access)
   SELECT * FROM projects WHERE tenant_id = 'UUID-2';
   ```

3. Verify logs show RLS policies blocking the cross-tenant query

### Test 3: Webhook Simulation

Stripe webhooks will sync subscription status. To test locally:

```bash
# 1. Start dev server
pnpm dev

# 2. Use Stripe CLI to forward webhooks (in another terminal)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 3. Trigger a test event
stripe trigger customer.subscription.updated
```

## 📊 Database Verification

Connect to Neon and verify:

```sql
-- Check tables exist
\dt

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

-- Should show: all tenant-scoped tables have rowsecurity = true

-- Check RLS policies exist
SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('tenants', 'projects', 'units', 'leads');
```

## 🔌 Integration Checklist

Before moving to Phase 1:

- [ ] Clerk account created + keys in `.env.local`
- [ ] Neon database provisioned + `DATABASE_URL` working
- [ ] Migrations run + RLS policies applied
- [ ] Plans inserted into DB
- [ ] Stripe test account created + webhook endpoint configured
- [ ] Dev server runs without errors (`pnpm dev`)
- [ ] Tenant creation API tested and working
- [ ] Multi-tenant isolation verified (RLS blocks cross-tenant reads)

## 📱 Customization

### Changing Default Plans

Edit the SQL insert in step 2 (Setup Database) to match your pricing model.

### Using Your Domain

Update Clerk custom domain settings and configure:
1. DNS records for your domain
2. Update `NEXT_PUBLIC_APP_URL` in `.env.local`
3. Configure HTTPS certificate

For subdomains (e.g., `tenant.yourdomain.com`), the middleware automatically extracts `tenant` and resolves it to the tenant record.

## 🆘 Troubleshooting

### "No DATABASE_URL found"
- Check `.env.local` is in the root directory
- Restart dev server after changing `.env.local`

### "RLS policy denies access"
- This means RLS is working! It's blocking something intentionally
- Check the policy names with: `SELECT * FROM pg_policies;`

### "Clerk sign-in not working"
- Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is correct
- Check Clerk dashboard for app status
- Clear browser cookies and try again

### "Stripe webhook not triggering"
- Use `stripe listen` to forward webhooks locally during development
- Verify webhook endpoint in Stripe dashboard points to correct URL

## 🚀 Next Steps (Phase 1)

Once Phase 0 is verified:

1. Implement 3D viewer components (react-three-fiber + Pannellum)
2. Build project/unit/asset management CMS
3. Setup R2 presigned URL uploads
4. Create storefront public routes

See `PHASE_0_STATUS.md` and architecture plan for details.

## 📞 Support

- Check README.md for architecture overview
- Review `.env.local` comments for each service
- Look at route handlers in `/src/app/api` for integration examples
- Schema is in `/src/server/db/schema.ts`

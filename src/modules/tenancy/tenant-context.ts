import { headers } from 'next/headers'
import { appDb as db } from '@/server/db/tenant-db'
import { eq } from 'drizzle-orm'
import { tenants } from '@/server/db/schema'

// Cache for tenant resolution (simple in-memory, Vercel Edge Config in production)
const tenantCache = new Map<string, { id: string; createdAt: number }>()
const CACHE_TTL = 1000 * 60 * 5 // 5 minutes

export async function getTenantFromSlug(slug: string): Promise<{ id: string } | null> {
  // Check cache first
  const cached = tenantCache.get(slug)
  if (cached && Date.now() - cached.createdAt < CACHE_TTL) {
    return { id: cached.id }
  }

  // Query database
  try {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
      columns: { id: true },
    })

    if (tenant) {
      tenantCache.set(slug, { id: tenant.id, createdAt: Date.now() })
      return tenant
    }
  } catch (error) {
    console.error('Error fetching tenant:', error)
  }

  return null
}

/**
 * Resolves the tenant bound to a custom-domain/subdomain request, via the
 * x-tenant-slug header set by middleware. This is for the future public
 * storefront-on-subdomain flow.
 *
 * For anything under /dashboard, use requireCurrentTenant() from
 * ./current-tenant instead — the admin panel resolves the tenant from the
 * signed-in Supabase user, not from the host header.
 */
export async function getTenantFromRequestHost() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')

  if (!tenantSlug) return null
  return getTenantFromSlug(tenantSlug)
}

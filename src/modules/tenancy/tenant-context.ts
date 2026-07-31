import { headers } from 'next/headers'
import { db } from '@/server/db/client'
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

export async function getCurrentTenant() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')

  if (!tenantSlug) {
    throw new Error('No tenant slug found in request')
  }

  const tenant = await getTenantFromSlug(tenantSlug)
  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantSlug}`)
  }

  return tenant
}

export async function getCurrentTenantId(): Promise<string> {
  const tenant = await getCurrentTenant()
  return tenant.id
}

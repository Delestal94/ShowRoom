import { db } from '@/server/db/client'
import { users, memberships, tenants } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { getUser } from '@/lib/supabase/server'

export interface CurrentTenant {
  tenantId: string
  tenantSlug: string
  tenantName: string
  userId: string
  role: string
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || 'tenant'
  let candidate = root
  let n = 1

  // Small table, low contention — a loop is simpler than a retry-on-conflict.
  while (await db.query.tenants.findFirst({ where: eq(tenants.slug, candidate) })) {
    n += 1
    candidate = `${root}-${n}`
  }

  return candidate
}

/**
 * Resolves the signed-in Supabase user to their ShowRoom tenant, creating
 * the `users` / `tenants` / `memberships` rows on first login.
 *
 * One tenant per account for now — good enough for a solo developer or a
 * single admin per developer. Multi-user tenants come later via invites.
 */
export async function getCurrentTenant(): Promise<CurrentTenant | null> {
  const authUser = await getUser()
  if (!authUser) return null

  const existing = await db.query.users.findFirst({
    where: eq(users.authUserId, authUser.id),
  })

  if (existing) {
    const membership = await db.query.memberships.findFirst({
      where: eq(memberships.userId, existing.id),
      with: { tenant: true },
    })
    if (!membership) return null

    return {
      tenantId: membership.tenantId,
      tenantSlug: membership.tenant.slug,
      tenantName: membership.tenant.name,
      userId: existing.id,
      role: membership.role,
    }
  }

  // First login: provision a tenant + admin membership for this account.
  const emailLocalPart = authUser.email?.split('@')[0] ?? 'mi-inmobiliaria'
  const slug = await uniqueSlug(emailLocalPart)

  return db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({ email: authUser.email ?? '', authUserId: authUser.id })
      .returning()

    const [tenant] = await tx
      .insert(tenants)
      .values({ name: emailLocalPart, slug })
      .returning()

    await tx.insert(memberships).values({
      userId: newUser.id,
      tenantId: tenant.id,
      role: 'tenant_admin',
    })

    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      userId: newUser.id,
      role: 'tenant_admin',
    }
  })
}

/** Same as getCurrentTenant(), but throws for routes that require a tenant. */
export async function requireCurrentTenant(): Promise<CurrentTenant> {
  const tenant = await getCurrentTenant()
  if (!tenant) throw new Error('No tenant found for the current user')
  return tenant
}

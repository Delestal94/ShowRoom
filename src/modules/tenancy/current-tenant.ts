import { randomUUID } from 'node:crypto'
import { users, memberships, tenants } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { getUser } from '@/lib/supabase/server'
import { appDb, withUser } from '@/server/db/tenant-db'

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

/**
 * Resolves the signed-in Supabase user to their ShowRoom tenant, creating
 * the `users` / `tenants` / `memberships` rows on first login.
 *
 * One tenant per account for now — multi-user tenants come later via invites.
 */
export async function getCurrentTenant(): Promise<CurrentTenant | null> {
  const authUser = await getUser()
  if (!authUser) return null

  // `users` is not tenant-scoped and carries no RLS, so it's safe to read
  // before any tenant context exists.
  const existing = await appDb.query.users.findFirst({
    where: eq(users.authUserId, authUser.id),
  })

  if (existing) {
    // Membership lookup runs under app.user_id: at this point we still
    // don't know the tenant, which is exactly what we're resolving.
    const membership = await withUser(existing.id, (tx) =>
      tx.query.memberships.findFirst({
        where: eq(memberships.userId, existing.id),
        with: { tenant: true },
      })
    )
    if (!membership) return null

    return {
      tenantId: membership.tenantId,
      tenantSlug: membership.tenant.slug,
      tenantName: membership.tenant.name,
      userId: existing.id,
      role: membership.role,
    }
  }

  // First login: provision a tenant and an admin membership.
  const emailLocalPart = authUser.email?.split('@')[0] ?? 'mi-inmobiliaria'
  const root = slugify(emailLocalPart) || 'inmobiliaria'

  const [newUser] = await appDb
    .insert(users)
    .values({ email: authUser.email ?? '', authUserId: authUser.id })
    .returning()

  // RLS hides other tenants' rows, so a "is this slug taken?" query would
  // always come back empty. The unique constraint is the real arbiter —
  // retry against it rather than pretending to check first.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? root : `${root}-${attempt + 1}`
    const tenantId = randomUUID()

    try {
      return await withUser(
        newUser.id,
        async (tx) => {
          const [tenant] = await tx
            .insert(tenants)
            .values({ id: tenantId, name: emailLocalPart, slug })
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
        },
        tenantId
      )
    } catch (error: any) {
      if (error?.code !== '23505') throw error
      // Slug collision — next iteration tries a suffixed variant.
    }
  }

  throw new Error('Could not allocate a unique tenant slug')
}

/** Same as getCurrentTenant(), but throws for routes that require a tenant. */
export async function requireCurrentTenant(): Promise<CurrentTenant> {
  const tenant = await getCurrentTenant()
  if (!tenant) throw new Error('No tenant found for the current user')
  return tenant
}

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { sql } from 'drizzle-orm'
import * as schema from './schema'

/**
 * Runtime database access.
 *
 * This pool connects as `showroom_app`, a role that is NOT the table owner
 * and does NOT have BYPASSRLS — so Postgres row-level security actually
 * applies to it. The owner connection (DATABASE_URL) keeps BYPASSRLS and is
 * reserved for migrations; using it at runtime would silently disable every
 * policy.
 *
 * Falls back to DATABASE_URL so local setups without the app role still boot,
 * but that path has no RLS enforcement — see assertRlsEnforced().
 */
const connectionString = process.env.DATABASE_URL_APP ?? process.env.DATABASE_URL

if (!process.env.DATABASE_URL_APP && process.env.NODE_ENV === 'production') {
  // Falling back keeps the app running rather than hard-failing a deploy,
  // but every RLS policy is inert on that connection — so make it loud.
  console.warn(
    '[showroom] DATABASE_URL_APP no está configurada: la app se conecta con el ' +
      'rol dueño, que tiene BYPASSRLS. Las políticas de aislamiento entre ' +
      'tenants NO se están aplicando.'
  )
}

const pool = new Pool({ connectionString })

export const appDb = drizzle(pool, { schema })

export type TenantTx = Parameters<Parameters<typeof appDb.transaction>[0]>[0]

/**
 * Runs `fn` inside a transaction with the tenant context set, so RLS
 * policies can scope every statement to that tenant.
 *
 * `set_config(..., true)` is transaction-local, which matters with a
 * connection pool: the setting is discarded on commit/rollback and can't
 * leak into the next request that reuses the connection.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: TenantTx) => Promise<T>
): Promise<T> {
  return appDb.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`)
    return fn(tx)
  })
}

/**
 * Session bootstrap: at login we know the app user but not yet their tenant,
 * so membership lookups run under `app.user_id` instead.
 *
 * `tenantId` is optional and only used when provisioning: the id is
 * generated app-side beforehand so that `INSERT ... RETURNING` — which
 * applies the SELECT policy to the returned rows — can actually see the
 * row it just wrote.
 */
export async function withUser<T>(
  userId: string,
  fn: (tx: TenantTx) => Promise<T>,
  tenantId?: string
): Promise<T> {
  return appDb.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`)
    if (tenantId) {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`)
    }
    return fn(tx)
  })
}

/**
 * Looking up (or creating) the app-level `users` row for a Supabase account.
 *
 * Runs before any tenant is known, so it declares the Supabase auth id and
 * the policy exposes only that person's row. Without this the table would
 * need to stay RLS-free, leaving every user's email readable by any query
 * that reached it.
 */
export async function withAuthUser<T>(
  authUserId: string,
  fn: (tx: TenantTx) => Promise<T>
): Promise<T> {
  return appDb.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.auth_user_id', ${authUserId}, true)`)
    return fn(tx)
  })
}

/**
 * Reading an invitation by its token, from someone who is not yet a member
 * of that tenant.
 *
 * The token being looked up is declared to Postgres, and the policy only
 * exposes the row whose token matches. A policy like `token IS NOT NULL`
 * would look similar but is always true — it would let any signed-in tenant
 * list everyone else's invitations, tokens included, and use them to join
 * another tenant.
 */
export async function withInviteToken<T>(
  token: string,
  fn: (tx: TenantTx) => Promise<T>,
  tenantId?: string
): Promise<T> {
  return appDb.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.invite_token', ${token}, true)`)
    if (tenantId) {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`)
    }
    return fn(tx)
  })
}

/**
 * Public storefront and anonymous ingest (leads, analytics). Runs with no
 * tenant context, so only the policies that explicitly allow anonymous
 * access apply — published projects and their units/tours.
 */
export const publicDb = appDb

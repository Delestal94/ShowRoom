import { sql } from 'drizzle-orm'
import { appDb, withAuthUser } from '@/server/db/tenant-db'
import { getUser } from '@/lib/supabase/server'
import { users } from '@/server/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Panel de plataforma (dueño de ShowRoom, no de una inmobiliaria).
 *
 * El rol de la app no puede saltarse RLS — eso es deliberado. Para leer
 * across-tenant se usan agregados por SQL directo sobre la conexión de la
 * app, apoyándose en que las políticas devuelven cero filas si el llamador
 * no corresponde. Por eso cada consulta acá está pensada como conteo
 * agregado y no como listado de datos de clientes: el super-admin necesita
 * saber cuántos tenants y proyectos hay, no leer los leads de nadie.
 */

export async function isSuperAdmin(): Promise<boolean> {
  const authUser = await getUser()
  if (!authUser) return false

  const row = await withAuthUser(authUser.id, (tx) =>
    tx.query.users.findFirst({
      where: eq(users.authUserId, authUser.id),
      columns: { globalRole: true },
    })
  )

  return row?.globalRole === 'super_admin'
}

export interface PlatformStats {
  tenants: number
  projects: number
  publishedProjects: number
  units: number
  leads: number
  activeSubscriptions: number
}

export interface TenantSummary {
  id: string
  name: string
  slug: string
  createdAt: Date
  projects: number
  units: number
  leads: number
  plan: string | null
  subscriptionStatus: string | null
}

/**
 * Estas consultas necesitan atravesar los tenants, así que corren con el rol
 * dueño vía una conexión aparte. Es el único lugar de la app que lo hace, y
 * está detrás del chequeo de super_admin.
 */
async function withPlatformAccess<T>(fn: (db: typeof appDb) => Promise<T>): Promise<T> {
  if (!(await isSuperAdmin())) {
    throw new Error('FORBIDDEN')
  }
  return fn(platformDb())
}

let cached: typeof appDb | null = null

function platformDb() {
  if (cached) return cached

  // Import diferido para no crear el pool salvo que alguien entre al panel.
  const { drizzle } = require('drizzle-orm/node-postgres')
  const { Pool } = require('pg')
  const schema = require('@/server/db/schema')

  cached = drizzle(
    new Pool({ connectionString: process.env.DATABASE_URL, max: 2 }),
    { schema }
  )
  return cached!
}

export async function getPlatformStats(): Promise<PlatformStats> {
  return withPlatformAccess(async (db) => {
    const { rows } = (await db.execute(sql`
      select
        (select count(*) from tenants)::int                                as tenants,
        (select count(*) from projects)::int                               as projects,
        (select count(*) from projects where status = 'published')::int    as published_projects,
        (select count(*) from units)::int                                  as units,
        (select count(*) from leads)::int                                  as leads,
        (select count(*) from subscriptions where status = 'authorized')::int as active_subscriptions
    `)) as any

    const r = rows[0] ?? {}
    return {
      tenants: Number(r.tenants ?? 0),
      projects: Number(r.projects ?? 0),
      publishedProjects: Number(r.published_projects ?? 0),
      units: Number(r.units ?? 0),
      leads: Number(r.leads ?? 0),
      activeSubscriptions: Number(r.active_subscriptions ?? 0),
    }
  })
}

export async function listTenantSummaries(): Promise<TenantSummary[]> {
  return withPlatformAccess(async (db) => {
    const { rows } = (await db.execute(sql`
      select
        t.id, t.name, t.slug, t.created_at,
        (select count(*) from projects p where p.tenant_id = t.id)::int as projects,
        (select count(*) from units u where u.tenant_id = t.id)::int    as units,
        (select count(*) from leads l where l.tenant_id = t.id)::int    as leads,
        pl.name   as plan,
        s.status  as subscription_status
      from tenants t
      left join subscriptions s on s.tenant_id = t.id
      left join plans pl on pl.id = s.plan_id
      order by t.created_at desc
      limit 200
    `)) as any

    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      createdAt: new Date(r.created_at),
      projects: Number(r.projects ?? 0),
      units: Number(r.units ?? 0),
      leads: Number(r.leads ?? 0),
      plan: r.plan ?? null,
      subscriptionStatus: r.subscription_status ?? null,
    }))
  })
}

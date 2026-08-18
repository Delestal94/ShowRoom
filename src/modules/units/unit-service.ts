import { units } from '@/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { withTenant, publicDb } from '@/server/db/tenant-db'

export async function createUnit(
  tenantId: string,
  projectId: string,
  data: {
    code: string
    floor?: number
    m2?: string
    price?: string
    currency?: string
    orientation?: string
    bedrooms?: number
    status?: string
  }
) {
  return withTenant(tenantId, async (tx) => {
    const [unit] = await tx
      .insert(units)
      .values({ tenantId, projectId, ...data })
      .returning()
    return unit
  })
}

/** Inserts many units in a single transaction — used by the CSV import. */
export async function createUnitsBulk(
  tenantId: string,
  projectId: string,
  rows: Array<{
    code: string
    floor?: number
    m2?: string
    price?: string
    currency?: string
    orientation?: string
    bedrooms?: number
    status?: string
  }>
) {
  if (rows.length === 0) return []

  return withTenant(tenantId, (tx) =>
    tx
      .insert(units)
      .values(rows.map((r) => ({ tenantId, projectId, ...r })))
      .returning()
  )
}

/**
 * Storefront lookup by the code shown in the URL. Runs with no tenant
 * context, so `units_select` only returns it when the parent project is
 * published — an unpublished project's units stay invisible.
 */
export async function getPublicUnitByCode(projectId: string, code: string) {
  return publicDb.query.units.findFirst({
    where: and(eq(units.projectId, projectId), eq(units.code, code)),
  })
}

export async function getUnit(tenantId: string, unitId: string) {
  return withTenant(tenantId, (tx) =>
    tx.query.units.findFirst({
      where: and(eq(units.id, unitId), eq(units.tenantId, tenantId)),
    })
  )
}

export async function listUnitsByProject(tenantId: string, projectId: string) {
  return withTenant(tenantId, (tx) =>
    tx.query.units.findMany({
      where: and(eq(units.tenantId, tenantId), eq(units.projectId, projectId)),
      orderBy: (u) => [u.code],
    })
  )
}

export async function updateUnit(
  tenantId: string,
  unitId: string,
  data: Partial<{
    code: string
    floor: number
    m2: string
    price: string
    currency: string
    status: string
    bedrooms: number
    orientation: string
  }>
) {
  return withTenant(tenantId, async (tx) => {
    const [updated] = await tx
      .update(units)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(units.id, unitId), eq(units.tenantId, tenantId)))
      .returning()
    return updated
  })
}

export async function deleteUnit(tenantId: string, unitId: string) {
  return withTenant(tenantId, async (tx) => {
    await tx
      .delete(units)
      .where(and(eq(units.id, unitId), eq(units.tenantId, tenantId)))
  })
}

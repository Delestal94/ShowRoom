import { db } from '@/server/db/client'
import { units } from '@/server/db/schema'
import { eq, and } from 'drizzle-orm'

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
  const [unit] = await db
    .insert(units)
    .values({
      tenantId,
      projectId,
      ...data,
    })
    .returning()

  return unit
}

export async function getUnit(tenantId: string, unitId: string) {
  const unit = await db.query.units.findFirst({
    where: and(
      eq(units.id, unitId),
      eq(units.tenantId, tenantId)
    ),
  })

  return unit
}

export async function listUnitsByProject(
  tenantId: string,
  projectId: string
) {
  return db.query.units.findMany({
    where: and(
      eq(units.tenantId, tenantId),
      eq(units.projectId, projectId)
    ),
    orderBy: (u) => [u.code],
  })
}

export async function updateUnit(
  tenantId: string,
  unitId: string,
  data: Partial<{
    code: string
    floor: number
    m2: string
    price: string
    status: string
    bedrooms: number
    orientation: string
  }>
) {
  const [updated] = await db
    .update(units)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(units.id, unitId),
        eq(units.tenantId, tenantId)
      )
    )
    .returning()

  return updated
}

export async function deleteUnit(
  tenantId: string,
  unitId: string
) {
  await db
    .delete(units)
    .where(
      and(
        eq(units.id, unitId),
        eq(units.tenantId, tenantId)
      )
    )
}

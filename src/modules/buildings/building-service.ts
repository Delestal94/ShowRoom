import { buildings, units } from '@/server/db/schema'
import { eq, and, asc, count } from 'drizzle-orm'
import { withTenant, publicDb } from '@/server/db/tenant-db'

/**
 * Torres o cuerpos dentro de un proyecto.
 *
 * Un emprendimiento de varias torres necesita agrupar sus unidades; los de
 * una sola simplemente no cargan ninguna y todo sigue colgando del proyecto,
 * sin cambiar nada de lo que ya funciona.
 */
export async function listBuildings(tenantId: string, projectId: string) {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx.query.buildings.findMany({
      where: eq(buildings.projectId, projectId),
      orderBy: [asc(buildings.sortOrder), asc(buildings.name)],
    })

    const counts = await tx
      .select({ buildingId: units.buildingId, total: count() })
      .from(units)
      .where(and(eq(units.tenantId, tenantId), eq(units.projectId, projectId)))
      .groupBy(units.buildingId)

    const byBuilding = new Map(counts.map((c) => [c.buildingId, Number(c.total)]))

    return rows.map((b) => ({ ...b, unitCount: byBuilding.get(b.id) ?? 0 }))
  })
}

export async function listPublicBuildings(projectId: string) {
  return publicDb.query.buildings.findMany({
    where: eq(buildings.projectId, projectId),
    orderBy: [asc(buildings.sortOrder), asc(buildings.name)],
  })
}

export async function createBuilding(
  tenantId: string,
  projectId: string,
  data: { name: string; floorsCount?: number }
) {
  return withTenant(tenantId, async (tx) => {
    const [row] = await tx
      .insert(buildings)
      .values({ projectId, ...data })
      .returning()
    return row
  })
}

export async function deleteBuilding(tenantId: string, buildingId: string) {
  return withTenant(tenantId, async (tx) => {
    // Las unidades quedan en el proyecto sin torre asignada (ON DELETE SET
    // NULL sobre units.building_id): borrar una torre no borra inventario.
    await tx.delete(buildings).where(eq(buildings.id, buildingId))
  })
}

export async function assignUnitsToBuilding(
  tenantId: string,
  buildingId: string | null,
  unitIds: string[]
) {
  if (unitIds.length === 0) return

  return withTenant(tenantId, async (tx) => {
    for (const unitId of unitIds) {
      await tx
        .update(units)
        .set({ buildingId, updatedAt: new Date() })
        .where(and(eq(units.id, unitId), eq(units.tenantId, tenantId)))
    }
  })
}

import { tours } from '@/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { withTenant, publicDb } from '@/server/db/tenant-db'

export type TourKind = '360' | 'glb-model' | 'drone-video' | 'image'

export async function createTour(
  tenantId: string,
  projectId: string,
  data: {
    unitId?: string
    kind: TourKind
    storageKey: string
    cdnUrl?: string
    metadata?: Record<string, any>
  }
) {
  return withTenant(tenantId, async (tx) => {
    const [tour] = await tx
      .insert(tours)
      .values({
        tenantId,
        projectId,
        unitId: data.unitId,
        kind: data.kind,
        storageKey: data.storageKey,
        cdnUrl: data.cdnUrl,
        metadataJson: data.metadata || {},
        // The upload finishes before this row is written and nothing runs
        // afterwards, so the asset is servable immediately. Marking it
        // 'processing' left every tour stuck in that state forever.
        status: 'ready',
      })
      .returning()
    return tour
  })
}

export async function getTour(tenantId: string, tourId: string) {
  return withTenant(tenantId, (tx) =>
    tx.query.tours.findFirst({
      where: and(eq(tours.id, tourId), eq(tours.tenantId, tenantId)),
    })
  )
}

export async function listToursByProject(tenantId: string, projectId: string) {
  return withTenant(tenantId, (tx) =>
    tx.query.tours.findMany({
      where: and(eq(tours.tenantId, tenantId), eq(tours.projectId, projectId)),
      orderBy: (t) => [t.createdAt],
    })
  )
}

/**
 * Storefront variant: runs with no tenant context, so it returns rows only
 * when `tours_select` matches via the project being published. Avoids giving
 * a public page a full tenant session just to list its tours.
 */
export async function listPublicToursByProject(projectId: string) {
  return publicDb.query.tours.findMany({
    where: eq(tours.projectId, projectId),
    orderBy: (t) => [t.createdAt],
  })
}

/**
 * Content attached to one specific unit, for its public detail page.
 * Same published-project gate as listPublicToursByProject.
 */
export async function listPublicToursByUnit(unitId: string) {
  return publicDb.query.tours.findMany({
    where: eq(tours.unitId, unitId),
    orderBy: (t) => [t.createdAt],
  })
}

export async function listToursByUnit(tenantId: string, unitId: string) {
  return withTenant(tenantId, (tx) =>
    tx.query.tours.findMany({
      where: and(eq(tours.tenantId, tenantId), eq(tours.unitId, unitId)),
      orderBy: (t) => [t.kind],
    })
  )
}

export async function updateTourStatus(
  tenantId: string,
  tourId: string,
  status: 'processing' | 'ready' | 'error'
) {
  return withTenant(tenantId, async (tx) => {
    const [updated] = await tx
      .update(tours)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(tours.id, tourId), eq(tours.tenantId, tenantId)))
      .returning()
    return updated
  })
}

export async function updateTourCdnUrl(
  tenantId: string,
  tourId: string,
  cdnUrl: string
) {
  return withTenant(tenantId, async (tx) => {
    const [updated] = await tx
      .update(tours)
      .set({ cdnUrl, status: 'ready', updatedAt: new Date() })
      .where(and(eq(tours.id, tourId), eq(tours.tenantId, tenantId)))
      .returning()
    return updated
  })
}

export async function deleteTour(tenantId: string, tourId: string) {
  return withTenant(tenantId, async (tx) => {
    await tx
      .delete(tours)
      .where(and(eq(tours.id, tourId), eq(tours.tenantId, tenantId)))
  })
}

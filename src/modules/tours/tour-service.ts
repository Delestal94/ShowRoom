import { db } from '@/server/db/client'
import { tours } from '@/server/db/schema'
import { eq, and } from 'drizzle-orm'

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
  const [tour] = await db
    .insert(tours)
    .values({
      tenantId,
      projectId,
      kind: data.kind,
      storageKey: data.storageKey,
      cdnUrl: data.cdnUrl,
      metadataJson: data.metadata || {},
      status: 'processing',
    })
    .returning()

  return tour
}

export async function getTour(tenantId: string, tourId: string) {
  const tour = await db.query.tours.findFirst({
    where: and(
      eq(tours.id, tourId),
      eq(tours.tenantId, tenantId)
    ),
  })

  return tour
}

export async function listToursByProject(
  tenantId: string,
  projectId: string
) {
  return db.query.tours.findMany({
    where: and(
      eq(tours.tenantId, tenantId),
      eq(tours.projectId, projectId)
    ),
    orderBy: (t) => [t.createdAt],
  })
}

export async function listToursByUnit(
  tenantId: string,
  unitId: string
) {
  return db.query.tours.findMany({
    where: and(
      eq(tours.tenantId, tenantId),
      eq(tours.unitId, unitId)
    ),
    orderBy: (t) => [t.kind],
  })
}

export async function updateTourStatus(
  tenantId: string,
  tourId: string,
  status: 'processing' | 'ready' | 'error'
) {
  const [updated] = await db
    .update(tours)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(tours.id, tourId),
        eq(tours.tenantId, tenantId)
      )
    )
    .returning()

  return updated
}

export async function updateTourCdnUrl(
  tenantId: string,
  tourId: string,
  cdnUrl: string
) {
  const [updated] = await db
    .update(tours)
    .set({ cdnUrl, status: 'ready', updatedAt: new Date() })
    .where(
      and(
        eq(tours.id, tourId),
        eq(tours.tenantId, tenantId)
      )
    )
    .returning()

  return updated
}

export async function deleteTour(
  tenantId: string,
  tourId: string
) {
  await db
    .delete(tours)
    .where(
      and(
        eq(tours.id, tourId),
        eq(tours.tenantId, tenantId)
      )
    )
}

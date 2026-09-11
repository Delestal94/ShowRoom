import { floorPlans, tours } from '@/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { withTenant } from '@/server/db/tenant-db'

export type FloorPlanSourceKind = 'image' | 'pdf'

export async function createFloorPlan(
  tenantId: string,
  projectId: string,
  data: {
    name: string
    level?: number
    buildingId?: string
    sourceStorageKey?: string
    sourceCdnUrl?: string
    sourceKind?: FloorPlanSourceKind
  }
) {
  return withTenant(tenantId, async (tx) => {
    const [plan] = await tx
      .insert(floorPlans)
      .values({
        tenantId,
        projectId,
        buildingId: data.buildingId,
        name: data.name,
        level: data.level,
        sourceStorageKey: data.sourceStorageKey,
        sourceCdnUrl: data.sourceCdnUrl,
        sourceKind: data.sourceKind ?? 'image',
        modelJson: {},
      })
      .returning()
    return plan
  })
}

export async function getFloorPlan(tenantId: string, planId: string) {
  return withTenant(tenantId, (tx) =>
    tx.query.floorPlans.findFirst({
      where: and(eq(floorPlans.id, planId), eq(floorPlans.tenantId, tenantId)),
    })
  )
}

export async function listFloorPlansByProject(tenantId: string, projectId: string) {
  return withTenant(tenantId, (tx) =>
    tx.query.floorPlans.findMany({
      where: and(eq(floorPlans.tenantId, tenantId), eq(floorPlans.projectId, projectId)),
      orderBy: (p) => [p.createdAt],
    })
  )
}

/**
 * Autoguardado: reemplaza el modelo editable entero. Se llama con el estado
 * completo del editor (muros, aberturas, escala), nunca con un parche
 * parcial — es el mismo motivo por el que `model_json` no está normalizado.
 */
export async function updateFloorPlanModel(
  tenantId: string,
  planId: string,
  data: { modelJson: unknown; pxPerMeter?: number | null; name?: string; level?: number | null }
) {
  return withTenant(tenantId, async (tx) => {
    const [updated] = await tx
      .update(floorPlans)
      .set({
        modelJson: data.modelJson,
        // String(null) daría el texto "null" en una columna numérica — hay
        // que distinguir "no tocar" (undefined) de "borrar" (null).
        pxPerMeter:
          data.pxPerMeter === undefined ? undefined : data.pxPerMeter === null ? null : String(data.pxPerMeter),
        name: data.name,
        level: data.level,
        updatedAt: new Date(),
      })
      .where(and(eq(floorPlans.id, planId), eq(floorPlans.tenantId, tenantId)))
      .returning()
    return updated
  })
}

export async function deleteFloorPlan(tenantId: string, planId: string) {
  return withTenant(tenantId, async (tx) => {
    await tx
      .delete(floorPlans)
      .where(and(eq(floorPlans.id, planId), eq(floorPlans.tenantId, tenantId)))
  })
}

/**
 * Publica el GLB ya exportado por el cliente como tour del proyecto.
 *
 * El GLB se genera y se sube desde el navegador (misma razón que documenta
 * el relevamiento: el usuario ya está viendo el modelo que aprueba). Esta
 * función sólo conecta ese archivo con las filas de `tours` y `floor_plans`,
 * en la misma transacción — republicar un plano actualiza su tour existente
 * en vez de crear uno duplicado.
 */
export async function publishFloorPlan(
  tenantId: string,
  planId: string,
  data: { projectId: string; storageKey: string; cdnUrl: string }
) {
  return withTenant(tenantId, async (tx) => {
    const plan = await tx.query.floorPlans.findFirst({
      where: and(
        eq(floorPlans.id, planId),
        eq(floorPlans.tenantId, tenantId),
        eq(floorPlans.projectId, data.projectId)
      ),
    })
    if (!plan) return null

    let tourId = plan.tourId
    if (tourId) {
      await tx
        .update(tours)
        .set({ storageKey: data.storageKey, cdnUrl: data.cdnUrl, status: 'ready', updatedAt: new Date() })
        .where(and(eq(tours.id, tourId), eq(tours.tenantId, tenantId)))
    } else {
      const [tour] = await tx
        .insert(tours)
        .values({
          tenantId,
          projectId: data.projectId,
          kind: 'glb-model',
          storageKey: data.storageKey,
          cdnUrl: data.cdnUrl,
          status: 'ready',
          metadataJson: { floorPlanId: planId },
        })
        .returning()
      tourId = tour.id
    }

    const [updated] = await tx
      .update(floorPlans)
      .set({ tourId, status: 'published', updatedAt: new Date() })
      .where(and(eq(floorPlans.id, planId), eq(floorPlans.tenantId, tenantId)))
      .returning()
    return updated
  })
}

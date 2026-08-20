import { withTenant, publicDb } from '@/server/db/tenant-db'
import { analyticsEvents } from '@/server/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'

export interface RecordEventInput {
  tenantId: string
  projectId: string
  sessionId: string
  brokerMemberId?: string
  brokerLinkId?: string
  eventType: string
  payload?: Record<string, any>
}

/** Inserta un lote completo en un solo statement. */
export async function recordEvents(inputs: RecordEventInput[]) {
  if (inputs.length === 0) return []

  return publicDb
    .insert(analyticsEvents)
    .values(
      inputs.map((input) => ({
        tenantId: input.tenantId,
        projectId: input.projectId,
        sessionId: input.sessionId,
        brokerMemberId: input.brokerMemberId,
        brokerLinkId: input.brokerLinkId,
        eventType: input.eventType,
        payloadJson: input.payload,
      }))
    )
    .returning({ id: analyticsEvents.id })
}

export async function recordEvent(input: RecordEventInput) {
  // Ingest comes from the public viewer with no session; the
  // analytics_events_insert policy allows anonymous writes on purpose.
  const [event] = await publicDb
    .insert(analyticsEvents)
    .values({
      tenantId: input.tenantId,
      projectId: input.projectId,
      sessionId: input.sessionId,
      brokerMemberId: input.brokerMemberId,
      brokerLinkId: input.brokerLinkId,
      eventType: input.eventType,
      payloadJson: input.payload,
    })
    .returning()

  return event
}

export async function getEventStats(
  tenantId: string,
  projectId: string,
  days: number = 7
) {
 return withTenant(tenantId, async (tx) => {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const where = and(
    eq(analyticsEvents.tenantId, tenantId),
    eq(analyticsEvents.projectId, projectId),
    gte(analyticsEvents.createdAt, cutoffDate)
  )

  // Totals and the per-type breakdown need different GROUP BY shapes, so
  // they're two queries rather than one jsonb_object_agg over a column that
  // doesn't exist without its own GROUP BY (that was the original bug here).
  const [totals] = await tx
    .select({
      totalEvents: sql<number>`COUNT(*)`,
      totalSessions: sql<number>`COUNT(DISTINCT ${analyticsEvents.sessionId})`,
    })
    .from(analyticsEvents)
    .where(where)

  const byType = await tx
    .select({
      eventType: analyticsEvents.eventType,
      count: sql<number>`COUNT(*)`,
    })
    .from(analyticsEvents)
    .where(where)
    .groupBy(analyticsEvents.eventType)

  const eventTypes = Object.fromEntries(byType.map((r) => [r.eventType, Number(r.count)]))

  return {
    totalEvents: Number(totals?.totalEvents ?? 0),
    totalSessions: Number(totals?.totalSessions ?? 0),
    eventTypes,
  }
 })
}

export async function getUnitPopularity(
  tenantId: string,
  projectId: string,
  days: number = 7
) {
 return withTenant(tenantId, async (tx) => {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // payloadJson maps to the real column `payload_json`, not `payload` —
  // the raw ->>'unit_id' reference here used to point at a column that
  // doesn't exist and failed on every call.
  const unitIdExpr = sql<string>`${analyticsEvents.payloadJson}->>'unit_id'`

  const result = await tx
    .select({
      unitId: unitIdExpr,
      views: sql<number>`COUNT(*)`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.tenantId, tenantId),
        eq(analyticsEvents.projectId, projectId),
        eq(analyticsEvents.eventType, 'unit_view'),
        gte(analyticsEvents.createdAt, cutoffDate)
      )
    )
    .groupBy(unitIdExpr)
    .orderBy(sql`COUNT(*) DESC`)

  return result
 })
}

export async function getHeatmapData(
  tenantId: string,
  projectId: string,
  days: number = 7
) {
 return withTenant(tenantId, async (tx) => {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const events = await tx
    .select()
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.tenantId, tenantId),
        eq(analyticsEvents.projectId, projectId),
        gte(analyticsEvents.createdAt, cutoffDate)
      )
    )

  // Group by unit for heatmap visualization
  const heatmapByUnit: Record<string, { views: number; dwell_time_ms: number; engagements: number }> = {}

  for (const event of events) {
    const payload = event.payloadJson as Record<string, any>
    const unitId = payload?.unit_id || 'unknown'

    if (!heatmapByUnit[unitId]) {
      heatmapByUnit[unitId] = { views: 0, dwell_time_ms: 0, engagements: 0 }
    }

    if (event.eventType === 'unit_view') {
      heatmapByUnit[unitId].views++
    } else if (event.eventType === 'dwell_time') {
      heatmapByUnit[unitId].dwell_time_ms += payload?.dwell_time_ms || 0
    } else if (['contact_form_submit', 'whatsapp_click', 'unit_compare', 'tour_view'].includes(event.eventType)) {
      heatmapByUnit[unitId].engagements++
    }
  }

  return heatmapByUnit
 })
}

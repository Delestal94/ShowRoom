import { db } from '@/server/db/client'
import { analyticsEvents } from '@/server/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'

export interface RecordEventInput {
  tenantId: string
  projectId: string
  sessionId: string
  brokerMemberId?: string
  eventType: string
  payload?: Record<string, any>
}

export async function recordEvent(input: RecordEventInput) {
  const [event] = await db
    .insert(analyticsEvents)
    .values({
      tenantId: input.tenantId,
      projectId: input.projectId,
      sessionId: input.sessionId,
      brokerMemberId: input.brokerMemberId,
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
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const result = await db
    .select({
      totalEvents: sql<number>`COUNT(*) as total_events`,
      totalSessions: sql<number>`COUNT(DISTINCT session_id) as total_sessions`,
      eventTypes: sql<Record<string, number>>`jsonb_object_agg(event_type, count)`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.tenantId, tenantId),
        eq(analyticsEvents.projectId, projectId),
        gte(analyticsEvents.createdAt, cutoffDate)
      )
    )

  return result[0] || { totalEvents: 0, totalSessions: 0, eventTypes: {} }
}

export async function getUnitPopularity(
  tenantId: string,
  projectId: string,
  days: number = 7
) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const result = await db
    .select({
      unitId: sql<string>`payload->>'unit_id' as unit_id`,
      views: sql<number>`COUNT(*) as views`,
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
    .groupBy(sql`payload->>'unit_id'`)
    .orderBy(sql`COUNT(*) DESC`)

  return result
}

export async function getHeatmapData(
  tenantId: string,
  projectId: string,
  days: number = 7
) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const events = await db
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
    } else if (['contact_form_submit', 'unit_compare', 'tour_view'].includes(event.eventType)) {
      heatmapByUnit[unitId].engagements++
    }
  }

  return heatmapByUnit
}

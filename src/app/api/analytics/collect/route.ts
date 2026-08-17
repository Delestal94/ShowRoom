import { recordEvent } from '@/modules/analytics/analytics-service'
import { projects } from '@/server/db/schema'
import { db } from '@/server/db/client'
import { eq } from 'drizzle-orm'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, events } = body

    if (!sessionId || !Array.isArray(events) || events.length === 0) {
      return Response.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
    }

    // Process each event
    for (const event of events) {
      const { projectSlug, unitId, tourId, type, metadata } = event

      // Resolve project by slug
      const project = await db.query.projects.findFirst({
        where: eq(projects.slug, projectSlug),
        columns: {
          id: true,
          tenantId: true,
        },
      })

      if (!project) continue

      // Record event
      await recordEvent({
        tenantId: project.tenantId,
        projectId: project.id,
        sessionId,
        eventType: type,
        payload: {
          unit_id: unitId,
          tour_id: tourId,
          ...metadata,
        },
      })
    }

    return Response.json({ success: true, processed: events.length })
  } catch (error) {
    console.error('Error collecting analytics:', error)
    return Response.json(
      { error: 'Failed to collect analytics' },
      { status: 500 }
    )
  }
}

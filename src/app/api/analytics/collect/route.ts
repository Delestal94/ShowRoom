import { cookies } from 'next/headers'
import { recordEvents } from '@/modules/analytics/analytics-service'
import { resolveTrackingCode } from '@/modules/brokers/broker-service'
import { checkRateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit'
import { projects } from '@/server/db/schema'
import { publicDb as db } from '@/server/db/tenant-db'
import { inArray } from 'drizzle-orm'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, events } = body

    if (!sessionId || !Array.isArray(events) || events.length === 0) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Tope duro por lote: cada evento hace una consulta más un insert, así
    // que un array sin límite es un DoS y un inflador de la base.
    if (events.length > 50) {
      return Response.json({ error: 'Too many events per batch' }, { status: 400 })
    }

    const limit = await checkRateLimit(clientKey(request, 'analytics'), 120, 3600)
    if (!limit.allowed) {
      return tooManyRequests('Demasiados eventos.')
    }

    // La atribución se resuelve una vez por lote, no por evento: todos los
    // eventos de una sesión vienen del mismo visitante.
    const ref = cookies().get('sr_ref')?.value
    const link = ref ? await resolveTrackingCode(ref) : null

    // Los slugs se resuelven una sola vez, no por evento: un lote de 50
    // eventos de la misma página hacía 50 consultas idénticas. Es el
    // endpoint de más tráfico de la app, así que el N+1 pegaba fuerte.
    const slugs = Array.from(
      new Set(events.map((e: any) => e.projectSlug).filter(Boolean))
    ) as string[]

    if (slugs.length === 0) {
      return Response.json({ success: true, processed: 0 })
    }

    const found = await db.query.projects.findMany({
      where: inArray(projects.slug, slugs),
      columns: { id: true, tenantId: true, slug: true },
    })
    const bySlug = new Map(found.map((p) => [p.slug, p]))

    // Y los eventos se insertan en un solo statement en vez de uno por vuelta.
    const toInsert = events.flatMap((event: any) => {
      const project = bySlug.get(event.projectSlug)
      if (!project) return []

      return [
        {
          tenantId: project.tenantId,
          projectId: project.id,
          sessionId,
          // Sólo si el link pertenece a este proyecto: un código de otro
          // proyecto no debe atribuirse acá.
          brokerLinkId: link?.projectId === project.id ? link.id : undefined,
          eventType: String(event.type ?? 'unknown').slice(0, 50),
          payload: {
            unit_id: event.unitId,
            tour_id: event.tourId,
            ...event.metadata,
          },
        },
      ]
    })

    await recordEvents(toInsert)

    return Response.json({ success: true, processed: toInsert.length })
  } catch (error) {
    console.error('Error collecting analytics:', error)
    return Response.json(
      { error: 'Failed to collect analytics' },
      { status: 500 }
    )
  }
}

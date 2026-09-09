import { cookies } from 'next/headers'
import { z } from 'zod'
import { recordEvents } from '@/modules/analytics/analytics-service'
import { resolveTrackingCode } from '@/modules/brokers/broker-service'
import { checkRateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit'
import { projects } from '@/server/db/schema'
import { publicDb as db } from '@/server/db/tenant-db'
import { inArray } from 'drizzle-orm'

// Endpoint público de más tráfico de la app: sin esta validación,
// `metadata` era un JSON arbitrario que se volcaba directo al payload
// insertado en la base, sin control de forma ni tamaño.
// Se acota también el largo de la *clave*, no sólo el del valor: sin esto
// 20 claves de largo arbitrario pasaban igual y el tope de tamaño que
// promete este comentario no era tal.
const metadataSchema = z
  .record(
    z.string().max(80),
    z.union([z.string().max(500), z.number(), z.boolean(), z.null()])
  )
  .refine((obj) => Object.keys(obj).length <= 20, {
    message: 'Too many metadata keys',
  })

const eventSchema = z.object({
  type: z.string().max(50).optional(),
  projectSlug: z.string().min(1).max(200).optional(),
  unitId: z.string().max(200).optional(),
  tourId: z.string().max(200).optional(),
  metadata: metadataSchema.optional(),
})

const bodySchema = z.object({
  sessionId: z.string().min(1).max(200),
  // Tope duro por lote: cada evento hace una consulta más un insert, así
  // que un array sin límite es un DoS y un inflador de la base.
  events: z.array(eventSchema).min(1).max(50),
})

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(rawBody)

    if (!parsed.success) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { sessionId, events } = parsed.data

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
      new Set(events.map((e) => e.projectSlug).filter(Boolean))
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
    const toInsert = events.flatMap((event) => {
      if (!event.projectSlug) return []
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
          // `metadata` va *antes* que las claves reservadas: viene de un
          // cliente sin auth, así que no puede pisar unit_id ni tour_id
          // (con las que después se agrupa el heatmap).
          payload: {
            ...event.metadata,
            unit_id: event.unitId,
            tour_id: event.tourId,
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

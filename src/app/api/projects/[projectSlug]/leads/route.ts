import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { publicDb as db } from '@/server/db/tenant-db'
import { projects, leads } from '@/server/db/schema'
import { resolveTrackingCode } from '@/modules/brokers/broker-service'
import { checkRateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit'
import { detectBot } from '@/lib/bot-check'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(
  request: Request,
  { params }: { params: { projectSlug: string } }
) {
  // Sin esto, cualquiera puede inundar el CRM del cliente con consultas
  // falsas. 5 por hora es holgado para una persona real y corta el spam.
  const limit = await checkRateLimit(clientKey(request, 'lead'), 5, 3600)
  if (!limit.allowed) {
    return tooManyRequests('Recibimos varias consultas tuyas. Probá de nuevo en un rato.')
  }

  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, params.projectSlug),
      columns: { id: true, tenantId: true, status: true },
    })

    // Un proyecto en borrador no debería estar recibiendo consultas.
    if (!project || project.status !== 'published') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const name = String(body.name ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const phone = String(body.phone ?? '').trim()
    const message = String(body.message ?? '').trim()

    // Se responde 200 a propósito: si el bot supiera que fue detectado,
    // iteraría hasta pasar. Para él parece que funcionó; el lead no se crea.
    const verdict = detectBot({
      honeypot: body.website,
      renderedAt: body.renderedAt,
    })
    if (verdict.bot) {
      console.warn(`Lead descartado (${verdict.reason}) en ${params.projectSlug}`)
      return NextResponse.json({ success: true })
    }

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Necesitamos al menos tu nombre y tu email.' },
        { status: 400 }
      )
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Revisá el email.' }, { status: 400 })
    }

    // Atribución: la cookie la escribe el middleware cuando alguien llega
    // con ?ref=. Se valida que el link exista y sea de este mismo proyecto,
    // para que un código ajeno no pueda robarse la consulta.
    const ref = cookies().get('sr_ref')?.value
    let brokerLinkId: string | null = null
    let source = 'website'

    if (ref) {
      const link = await resolveTrackingCode(ref)
      if (link && link.projectId === project.id) {
        brokerLinkId = link.id
        source = 'broker'
      }
    }

    const [lead] = await db
      .insert(leads)
      .values({
        tenantId: project.tenantId,
        projectId: project.id,
        brokerLinkId,
        name,
        email,
        phone: phone || undefined,
        source,
        status: 'new',
        utmJson: message ? { message } : undefined,
      })
      .returning()

    return NextResponse.json({ success: true, leadId: lead.id })
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: 'No pudimos registrar tu consulta. Probá de nuevo.' },
      { status: 500 }
    )
  }
}
